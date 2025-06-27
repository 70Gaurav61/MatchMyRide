import express from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { 
    createRideRequest,
    deleteRide,
    updateRideTime,
    updateRideStatus,
    getUserRides,
    getRideMatches
 } from '../controllers/ride.controller.js';

const router = express.Router();

router.post('/create', verifyJWT, createRideRequest);
router.delete('/delete', verifyJWT, deleteRide);
router.patch('/update-time', verifyJWT, updateRideTime);
router.patch('/update-status', verifyJWT, updateRideStatus);
router.get('/user-rides', verifyJWT, getUserRides);
router.post('/matched', verifyJWT, getRideMatches);

export default router;