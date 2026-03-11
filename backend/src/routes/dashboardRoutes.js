import express from 'express';
import {
    getDashboardStats,
    getDoctorDashboard,
    getReceptionistDashboard,
    getPharmacistDashboard,
    getOpticianDashboard,
} from '../controllers/dashboardController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/stats', authenticate, authorize('ADMIN', 'SUPERADMIN', 'DOCTOR', 'RECEPTIONIST', 'PHARMACIST', 'OPTICIAN'), getDashboardStats);
router.get('/doctor', authenticate, authorize('DOCTOR'), getDoctorDashboard);
router.get('/receptionist', authenticate, authorize('RECEPTIONIST'), getReceptionistDashboard);
router.get('/pharmacist', authenticate, authorize('PHARMACIST'), getPharmacistDashboard);
router.get('/optician', authenticate, authorize('OPTICIAN'), getOpticianDashboard);

export default router;
