import mongoose from 'mongoose';

const rideSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  source: {
    type: String,
    required: true,
  },
  destination: {
    type: String,
    required: true,
  },
  datetime: {
    type: Date,
    required: true,
  },
  sourceLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  },
  destinationLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  },
  route: {
    type: {
      type: String,
      enum: ['LineString'],
      default: 'LineString'
    },
    coordinates: {
      type: [[Number]], // Array of [lng, lat]
      required: false
    }
  },
  genderPreference: {
    type: String,
    enum: ['Any', 'Male', 'Female'],
    default: 'Any',
  },
  status: {
    type: String,
    enum: ['Open', 'Matched', 'Completed', 'Cancelled'],
    default: 'Open',
  },
}, { timestamps: true });

rideSchema.index({ sourceLocation: '2dsphere' });
rideSchema.index({ destinationLocation: '2dsphere' });
rideSchema.index({ route: '2dsphere' });

export const Ride = mongoose.model('Ride', rideSchema);