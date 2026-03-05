import express from 'express';
import { getAllDoctors } from '../controllers/doctorController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Allow both ADMIN and SUPERADMIN to view doctor information
router.get('/', authenticate, authorize('ADMIN', 'SUPERADMIN'), getAllDoctors);

export default router;
