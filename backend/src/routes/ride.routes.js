import express from 'express';
import { createRideRequest } from '../controllers/ride.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/ride', verifyJWT, createRideRequest);

export default router;