import { Ride } from '../models/ride.model.js';
import { Group } from '../models/group.model.js';
import { getRouteGeoJSON } from '../utils/mapbox.js';

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

export const getRideDetails = async (req, res) => {
  try {
    const { rideId } = req.params;
    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    const group = await Group.findOne({ 'members.ride': rideId, 'status': 'closed' })
      .populate({ path: 'members.user', select: 'fullName avatar' })
      .populate({ path: 'members.ride' })
      .lean();
    if (!group) return res.status(404).json({ message: 'Group not found for this ride' });

    group.confirmedMembers = (group.members || []).map(m => ({
      user: m.user._id,
      fullName: m.user.fullName,
      avatar: m.user.avatar,
      ready: m.status === 'ready',
    }));

    const sources = group.members
      .map(m => m.ride?.sourceLocation?.coordinates)
      .filter(Boolean)

    const destinations = group.members
      .map(m => m.ride?.destinationLocation?.coordinates)
      .filter(Boolean)
      
      let waypoints = [];
      if (sources.length && destinations.length) {
        waypoints = [...sources, ...destinations];
      } else {
        waypoints = [ride.sourceLocation.coordinates.slice().reverse(), ride.destinationLocation.coordinates.slice().reverse()];
      }
      let route = null;
      
    try {
      route = await getRouteGeoJSON(waypoints);
    } catch (e) {
      console.log("Error while route finding", e);
      route = null;
    }

    res.status(200).json({
      ride: {
        _id: ride._id,
        source: ride.source,
        destination: ride.destination,
        datetime: ride.datetime,
        status: ride.status,
        genderPreference: ride.genderPreference,
        sourceCoordinates: ride.sourceLocation.coordinates,
        destinationCoordinates: ride.destinationLocation.coordinates,
      },
      group,
      route,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while fetching ride details' });
  }
};
