import { Ride } from '../models/ride.model.js';
import { Group } from '../models/group.model.js';
import { getRouteGeoJSON } from '../utils/mapbox.js';
import * as turf from "@turf/turf";

const haversineDistance = (coord1, coord2) => {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Helper to get bearing between two coordinates
function getBearing(coord1, coord2) {
  const [lon1, lat1] = coord1.map(x => x * Math.PI / 180);
  const [lon2, lat2] = coord2.map(x => x * Math.PI / 180);
  const dLon = lon2 - lon1;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) -
            Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  let brng = Math.atan2(y, x) * 180 / Math.PI;
  brng = (brng + 360) % 360; // Normalize to 0-360
  return brng;
}

export const getRideMatches = async (req, res) => {
  try {
    const { rideId } = req.body;
    const checkOverlap = req.query?.checkOverlap !== 'false';

    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    // Step 1: Time window
    const timeWindow = 30 * 60 * 1000;
    const lowerBound = new Date(ride.datetime.getTime() - timeWindow);
    const upperBound = new Date(ride.datetime.getTime() + timeWindow);

    // Step 2: Proximity radius (10% of ride length)
    const totalDistance = haversineDistance(
      ride.sourceLocation.coordinates,
      ride.destinationLocation.coordinates
    );
    const proximityRadiusMeters = totalDistance * 0.1 * 1000;

    // Step 3: Find candidate rides
    const candidates = await Ride.find({
      user: { $ne: req.user._id },
      status: 'Open',
      datetime: { $gte: lowerBound, $lte: upperBound },
      genderPreference: { $in: ['Any', ride.genderPreference] },
      sourceLocation: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: ride.sourceLocation.coordinates,
          },
          $maxDistance: proximityRadiusMeters,
        },
      },
    }).populate('user', 'fullName contactNumber avatar gender');

    // Filter by destination proximity manually
    const finalMatches = candidates.filter(candidate => {
      const destDeviation = haversineDistance(
        ride.destinationLocation.coordinates,
        candidate.destinationLocation.coordinates
      );

      return (
        destDeviation <= proximityRadiusMeters/1000
      );
    });
    // Step 4: Optional — check for route overlap (GeoIntersect or post-filter)
    // For now we skip heavy overlap calculation; can be added later with Turf.js
    let overlapMatches = [];
    if (checkOverlap && ride.route) {
      overlapMatches = await Ride.find({
        user: { $ne: req.user._id },
        status: 'Open',
        genderPreference: { $in: ['Any', ride.genderPreference] },
        route: {
          $geoIntersects: {
            $geometry: ride.route
          }
        }
      }).populate('user', 'fullName contactNumber avatar gender');
      
      // Simple directionality filter using bearing
      if (ride.route && ride.route.coordinates && ride.route.coordinates.length > 1) {
        const directionThreshold = 45; // degrees
        const rideStart = ride.route.coordinates[0];
        const rideEnd = ride.route.coordinates[ride.route.coordinates.length - 1];
        const rideBearing = getBearing(rideStart, rideEnd);
        overlapMatches = overlapMatches.filter(candidate => {
          if (!candidate.route || !candidate.route.coordinates || candidate.route.coordinates.length < 2) return false;
          const candStart = candidate.route.coordinates[0];
          const candEnd = candidate.route.coordinates[candidate.route.coordinates.length - 1];
          const candBearing = getBearing(candStart, candEnd);
          let diff = Math.abs(rideBearing - candBearing);
          if (diff > 180) diff = 360 - diff; // Shortest angle
          return diff <= directionThreshold;
        });
      }
    }

    const uniqueRides = {};
    [...finalMatches, ...overlapMatches].forEach(r => {
      uniqueRides[r._id] = r;
    });

    res.status(200).json({
      matches: Object.values(uniqueRides),
      method: checkOverlap ? 'time + proximity OR route-overlap' : 'time + proximity'
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getRideMatchesV2 = async (req, res) => {
  try {
    const { rideId } = req.body;

    // 1. Fetch & Validate
    const myRide = await Ride.findById(rideId);
    if (!myRide) return res.status(404).json({ message: "Ride not found" });

    const myStartCoords = myRide.sourceLocation.coordinates;
    const myEndCoords = myRide.destinationLocation.coordinates;
    const myTime = new Date(myRide.datetime);
    const currTime = Date.now();

    if (currTime > myTime.getTime() + 8 * 60 * 60 * 1000) {
      return res
        .status(400)
        .json({ message: "Ride time exceeded for matching" });
    }

    // 2. Constants
    const EARTH_RADIUS_METERS = 6378100;
    const THIRTY_MIN_MS = 30 * 60 * 1000;
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const ROUTE_BUFFER_KM = 2; // How far off-route can the driver pick up?

    // 3. Prep Logic for Case A (Neighbors)
    const from = turf.point(myStartCoords);
    const to = turf.point(myEndCoords);
    const totalDistKm = turf.distance(from, to, { units: "kilometers" });
    const peerRadiusRadians = (Math.max(totalDistKm, 0.5) * 0.1 * 1000) / EARTH_RADIUS_METERS;

    // Search Polygons for Case B (Others Routes passing near my start & end)
    const startSearchPoly = turf.circle(myStartCoords, ROUTE_BUFFER_KM, {
      steps: 32,
      units: "kilometers",
    }).geometry;
    const endSearchPoly = turf.circle(myEndCoords, ROUTE_BUFFER_KM, {
      steps: 32,
      units: "kilometers",
    }).geometry;

    // 4. PREP LOGIC FOR CASE C (Me passing near others start & end)
    let routeCorridor = null;

    if (myRide.route && myRide.route.coordinates && myRide.route.coordinates.length > 1) {
      const myRouteLine = turf.lineString(myRide.route.coordinates);

      // Create a "Corridor" Polygon: 2km buffer around the entire route
      const buffered = turf.buffer(myRouteLine, ROUTE_BUFFER_KM, {
        units: "kilometers",
      });
      routeCorridor = buffered.geometry;
    }

    // 5. QUERY
    const orConditions = [
      // CASE A: Peer Match (Neighbors)
      {
        $and: [
          {
            datetime: {
              $gte: new Date(myTime.getTime() - THIRTY_MIN_MS),
              $lte: new Date(myTime.getTime() + THIRTY_MIN_MS),
            },
          },
          {
            sourceLocation: {
              $geoWithin: { $centerSphere: [myStartCoords, peerRadiusRadians] },
            },
          },
          {
            destinationLocation: {
              $geoWithin: { $centerSphere: [myEndCoords, peerRadiusRadians] },
            },
          },
        ],
      },
      // CASE B: Passenger finding Driver (I intersect THEIR route)
      {
        $and: [
          {
            datetime: {
              $gte: new Date(myTime.getTime() - ONE_DAY_MS),
              $lte: new Date(myTime.getTime() + ONE_DAY_MS),
            },
          },
          { route: { $geoIntersects: { $geometry: startSearchPoly } } },
          { route: { $geoIntersects: { $geometry: endSearchPoly } } },
        ],
      },
    ];

    // CASE C: THEY are inside MY route corridor
    if (routeCorridor) {
      orConditions.push({
        $and: [
          { datetime: { $gte: new Date(myTime.getTime() - ONE_DAY_MS), $lte: new Date(myTime.getTime() + ONE_DAY_MS) } },
          { sourceLocation: { $geoWithin: { $geometry: routeCorridor } } },
          { destinationLocation: { $geoWithin: { $geometry: routeCorridor } } },
        ],
      });
    }

    // 6. Execute Query
    const candidates = await Ride.find({
      user: { $ne: req.user._id },
      status: "Open",
      genderPreference: { $in: ["Any", myRide.genderPreference] },
      $or: orConditions,
    })
      .limit(50)
      .populate("user", "fullName avatar gender")
      .lean();

    // 7. Filter (Bearing & Sequence)
    // directionality check
    const validMatches = candidates.filter((candidate) => {
      const candStart = candidate.sourceLocation.coordinates;
      const candEnd = candidate.destinationLocation.coordinates;

      // --- FILTER 1: General Direction (Bearing) ---
      // Even if points match, we don't want someone going the opposite way.
      const myBearing = turf.bearing(from, to);
      const candBearing = turf.bearing(
        turf.point(candStart),
        turf.point(candEnd)
      );

      let bearingDiff = Math.abs(myBearing - candBearing);
      if (bearingDiff > 180) bearingDiff = 360 - bearingDiff;

      // If deviation > 45 degrees, reject.
      if (bearingDiff > 45) return false;

      // --- FILTER 2: Sequence Check (Critical for Case B) ---
      // If overlapping, does the driver hit my Pickup BEFORE my Drop?
      // This prevents matching a driver going A->B->C with a user wanting C->B.

      if (
        candidate.route &&
        candidate.route.coordinates &&
        candidate.route.coordinates.length > 1
      ) {
        const line = turf.lineString(candidate.route.coordinates);

        // Snap my points to their route to find "location" (distance from start)
        const startSnap = turf.nearestPointOnLine(line, from);
        const endSnap = turf.nearestPointOnLine(line, to);

        // If pickup happens AFTER drop on their route, it's invalid.
        if (startSnap.properties.location >= endSnap.properties.location) {
          return false;
        }
      }

      return true;
    });

    const matchingRideIds = validMatches.map((r) => r._id);

    const matchingGroups = await Group.find({
      "members.ride": { $in: matchingRideIds },
      "members.user": { $ne: req.user._id },
      status: "open",
    })
      .populate("members.user", "fullName avatar gender")
      .populate("admin", "fullName avatar gender")
      .lean();

    res.status(200).json({
      rides: validMatches,
      groups: matchingGroups,
      method: "v2 - peer proximity + route intersection + groups",
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Server error while finding matches" });
  }
};

export const createRideRequest = async (req, res) => {
  try {
    const { source, destination, datetime, sourceCoordinates, destinationCoordinates, genderPreference } = req.body;

    const sourceLocation = {
      type: 'Point',
      coordinates: sourceCoordinates,
    }

    const destinationLocation = {
      type: 'Point',
      coordinates: destinationCoordinates,
    }

    const geojsonRoute = await getRouteGeoJSON([
      sourceCoordinates,
      destinationCoordinates
    ]);
    
    const ride = await Ride.create({
      user: req.user._id,
      source,
      destination,
      datetime,
      sourceLocation,
      destinationLocation,
      route: geojsonRoute.geometry,
      genderPreference,
    });

    res.status(200).json({ ride, message: 'Ride created Successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while creating ride' });
  }
};

export const deleteRide = async (req, res) => {

  try {
    const { rideId } = req.body
  
    const deletedRide = await Ride.findByIdAndDelete(rideId)

    if(!deletedRide) {
      return res.status(400).json({message: 'Invalid Ride id'})
    }
  
    res.status(200).json({message: 'ride deleted successfully'})
  } catch (err) {
    console.error(err)
    res.status(500).json({message: 'Server error while deleting ride'})
  }

}

export const updateRideTime = async (req, res) => {
  
  try {
    const { datetime, rideId } = req.body
  
    const ride = await Ride.findByIdAndUpdate(rideId, {datetime: datetime}, {new: true})
  
    if(!ride) {
      return res.status(400).json({message: 'Invalid Ride id'})
    }
  
    res.status(200).json({ride, message: 'Ride Time updated'})
  } catch (err) {
    console.error(err)
    res.status(500).json({message: 'Server error while updating ride time'})
  }
  
}

export const updateRideStatus = async (req, res) => {

  try {
    const { status, rideId } = req.body
  
    const ride = await Ride.findByIdAndUpdate(rideId, {status}, {new: true})
  
    if(!ride) {
      return res.status(400).json({message: 'Invalid Ride id'})
    }
  
    res.status(200).json({ride, message: 'Ride status updated'})
  } catch (err) {
    console.error(err)
    res.status(500).json({message: 'Server error while updating ride status'})
  }

}

export const getUserRides = async (req, res) => {
  try {
    const rides = await Ride.find({ user: req.user._id });

    res.status(200).json({ rides, message: 'Rides fetched successfully' });
  } catch(err) {
    console.error(err)
    res.status(500).json({message: 'Server error while fetching user rides'})
  }
}

export const getRideGroup = async (req, res) => {
  try {
    const { rideId } = req.params;

    const group = await Group.findOne({ 'members.ride': rideId, status: 'closed' })
      .populate({
          path: 'members.user',
          select: 'fullName avatar'
      })
      .populate('admin', 'fullName avatar')
      .populate({
          path: 'members.ride'
      })
      .lean();

    if (!group) {
      return res.status(404).json({ message: 'Matching Group not found for this ride' });
    }

    res.status(200).json({ group, message: 'Group fetched successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while fetching ride group' });
  }
}