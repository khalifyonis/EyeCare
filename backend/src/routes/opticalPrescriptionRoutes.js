import express from 'express';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import validate from '../middlewares/validate.js';
import {
    createOpticalPrescriptionSchema,
    updateOpticalPrescriptionSchema,
} from '../middlewares/validationSchemas.js';
import {
    listOpticalPrescriptions,
    getOpticalPrescriptionById,
    createOpticalPrescription,
    getOpticalPrescriptionStats,
    updateOpticalPrescription,
    deleteOpticalPrescription,
    dispenseOpticalPrescription,
} from '../controllers/opticalPrescriptionController.js';

const router = express.Router();

router.get('/', authenticate, authorize('ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'DOCTOR', 'OPTICIAN', 'PHARMACIST'), listOpticalPrescriptions);
router.get('/stats', authenticate, authorize('ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'DOCTOR', 'OPTICIAN', 'PHARMACIST'), getOpticalPrescriptionStats);
router.get('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'DOCTOR', 'OPTICIAN', 'PHARMACIST'), getOpticalPrescriptionById);
router.post('/', authenticate, authorize('ADMIN', 'SUPERADMIN', 'DOCTOR', 'OPTICIAN'), validate(createOpticalPrescriptionSchema), createOpticalPrescription);
router.post('/:id/dispense', authenticate, authorize('ADMIN', 'SUPERADMIN', 'OPTICIAN'), dispenseOpticalPrescription);
router.put('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN', 'DOCTOR', 'OPTICIAN'), validate(updateOpticalPrescriptionSchema), updateOpticalPrescription);
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN', 'DOCTOR', 'OPTICIAN'), deleteOpticalPrescription);

export default router;
