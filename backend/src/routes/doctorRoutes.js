import express from 'express';
import { getAllDoctors } from '../controllers/doctorController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Doctors list: admin and receptionist (for booking dropdown)
router.get('/', authenticate, authorize('ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'DOCTOR'), getAllDoctors);

export default router;
