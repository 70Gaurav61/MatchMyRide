import { Ride } from '../models/ride.model.js';
import { User } from '../models/user.model.js';

const matchRides = async (newRide, userGender) => {
  const timeWindow = 30 * 60 * 1000; // ±30 minutes
  const fromTime = new Date(newRide.datetime.getTime() - timeWindow);
  const toTime = new Date(newRide.datetime.getTime() + timeWindow);

  const matches = await Ride.find({
    datetime: { $gte: fromTime, $lte: toTime },
    _id: { $ne: newRide._id },
    genderPreference: { $in: ['Any', userGender] },
    sourceLocation: {
      $nearSphere: {
        $geometry: { type: 'Point', coordinates: newRide.sourceLocation.coordinates },
        $maxDistance: 3000, // 3 km
      },
    },
    destinationLocation: {
      $nearSphere: {
        $geometry: { type: 'Point', coordinates: newRide.destinationLocation.coordinates },
        $maxDistance: 3000,
      },
    },
  }).populate('user', 'fullName contactNumber');

  return matches;
};

export const createRideRequest = async (req, res) => {
  try {
    const { source, destination, datetime, sourceLocation, destinationLocation, genderPreference } = req.body;

    const ride = await Ride.create({
      user: req.user._id,
      source,
      destination,
      datetime,
      sourceLocation,
      destinationLocation,
      genderPreference,
    });

    const matches = await matchRides(ride, req.user.gender);
    res.json({ ride, matches });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while creating ride' });
  }
};
