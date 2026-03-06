import express from 'express';
import { getDashboardStats } from '../controllers/dashboardController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Dashboard stats: all roles that have a dashboard
router.get('/stats', authenticate, authorize('ADMIN', 'SUPERADMIN', 'DOCTOR', 'RECEPTIONIST', 'PHARMACIST', 'OPTICIAN'), getDashboardStats);

export default router;
