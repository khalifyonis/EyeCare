import express from 'express';
import {
    getFinancialReport,
    getClinicalReport,
    getAppointmentReport,
    getPatientReport,
    getInventoryReport,
    getOperationalReport
} from '../controllers/reportController.js';
import { authenticate, checkPermission } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/financial', authenticate, checkPermission('reports_financial', 'canRead'), getFinancialReport);
router.get('/clinical', authenticate, checkPermission('reports_clinical', 'canRead'), getClinicalReport);
router.get('/appointments', authenticate, checkPermission('reports_appointments', 'canRead'), getAppointmentReport);
router.get('/patients', authenticate, checkPermission('reports_patients', 'canRead'), getPatientReport);
router.get('/inventory', authenticate, checkPermission('reports_inventory', 'canRead'), getInventoryReport);
router.get('/operational', authenticate, checkPermission('reports_operational', 'canRead'), getOperationalReport);

export default router;
