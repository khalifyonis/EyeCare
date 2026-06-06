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

router.get('/financial', authenticate, authorize('ADMIN', 'SUPERADMIN'), getFinancialReport);
router.get('/clinical', authenticate, authorize('ADMIN', 'SUPERADMIN', 'DOCTOR'), getClinicalReport);
router.get('/appointments', authenticate, authorize('ADMIN', 'SUPERADMIN', 'DOCTOR', 'RECEPTIONIST'), getAppointmentReport);
router.get('/patients', authenticate, authorize('ADMIN', 'SUPERADMIN', 'DOCTOR', 'RECEPTIONIST'), getPatientReport);
router.get('/inventory', authenticate, authorize('ADMIN', 'SUPERADMIN', 'PHARMACIST', 'OPTICIAN'), getInventoryReport);
router.get('/operational', authenticate, authorize('ADMIN', 'SUPERADMIN'), getOperationalReport);

export default router;
