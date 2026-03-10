import express from 'express';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import validate from '../middlewares/validate.js';
import {
    createPrescriptionSchema,
    updatePrescriptionSchema,
} from '../middlewares/validationSchemas.js';
import {
    listPrescriptions,
    getPrescriptionById,
    createPrescription,
    updatePrescription,
    deletePrescription,
} from '../controllers/prescriptionController.js';

const router = express.Router();

router.get('/', authenticate, authorize('ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'DOCTOR', 'OPTICIAN', 'PHARMACIST'), listPrescriptions);
router.get('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'DOCTOR', 'OPTICIAN', 'PHARMACIST'), getPrescriptionById);
router.post('/', authenticate, authorize('ADMIN', 'SUPERADMIN', 'DOCTOR', 'OPTICIAN', 'PHARMACIST'), validate(createPrescriptionSchema), createPrescription);
router.put('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN', 'DOCTOR', 'OPTICIAN', 'PHARMACIST'), validate(updatePrescriptionSchema), updatePrescription);
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN', 'DOCTOR', 'OPTICIAN', 'PHARMACIST'), deletePrescription);

export default router;
