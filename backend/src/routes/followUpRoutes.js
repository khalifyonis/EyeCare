import express from 'express';
import { listByPatient, listDue, markComplete, cancel } from '../controllers/followUpController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/due', authenticate, authorize('ADMIN', 'SUPERADMIN', 'DOCTOR', 'RECEPTIONIST'), listDue);
router.get('/patient/:patientId', authenticate, authorize('ADMIN', 'SUPERADMIN', 'DOCTOR', 'RECEPTIONIST'), listByPatient);
router.put('/:id/complete', authenticate, authorize('ADMIN', 'SUPERADMIN', 'DOCTOR', 'RECEPTIONIST'), markComplete);
router.put('/:id/cancel', authenticate, authorize('ADMIN', 'SUPERADMIN', 'DOCTOR'), cancel);

export default router;
