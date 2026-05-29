import express from 'express';
import {
    getFinancialReport,
    getClinicalReport,
    getAppointmentReport,
    getPatientReport,
    getInventoryReport,
    getOperationalReport
} from '../controllers/reportController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

const allRoles = ['ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'DOCTOR', 'OPTICIAN', 'PHARMACIST'];

router.get('/financial', authenticate, authorize(...allRoles), getFinancialReport);
router.get('/clinical', authenticate, authorize(...allRoles), getClinicalReport);
router.get('/appointments', authenticate, authorize(...allRoles), getAppointmentReport);
router.get('/patients', authenticate, authorize(...allRoles), getPatientReport);
router.get('/inventory', authenticate, authorize(...allRoles), getInventoryReport);
router.get('/operational', authenticate, authorize(...allRoles), getOperationalReport);

export default router;
