import { Ride } from '../models/ride.model.js';
import { Group } from '../models/group.model.js';
import { getRouteGeoJSON } from '../utils/mapbox.js';

const matchRides = async (newRide, user) => {
  // enhance this logic to include more complex matching criteria later

  const timeWindow = 30 * 60 * 1000; // ±30 minutes
  const fromTime = new Date(newRide.datetime.getTime() - timeWindow);
  const toTime = new Date(newRide.datetime.getTime() + timeWindow);

  const matches = await Ride.find({
    datetime: { $gte: fromTime, $lte: toTime },
    user: { $ne: user._id },
    genderPreference: { $in: ['Any', user.gender] },
    sourceLocation: {
      $nearSphere: {
        $geometry: { type: 'Point', coordinates: newRide.sourceLocation.coordinates },
        $maxDistance: 3000, // 3 km
      },
    },
  }).populate('user', 'fullName contactNumber avatar gender');

  return matches;
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
    
    const ride = await Ride.create({
      user: req.user._id,
      source,
      destination,
      datetime,
      sourceLocation,
      destinationLocation,
      genderPreference,
    });

    const matches = await matchRides(ride, req.user);
    res.status(200).json({ ride, matches, message: 'Ride created Successfully' });
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

export const getRideMatches = async (req, res) => {
  try {
    
    const { rideId } = req.body

    const ride = await Ride.findById(rideId)
    
    const matches = await matchRides(ride, req.user)

    res.status(200).json({ matches: matches, message: 'Matches fetched Successfully'});
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while fetching ride matches' });
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
