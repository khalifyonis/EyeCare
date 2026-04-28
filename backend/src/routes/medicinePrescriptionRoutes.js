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
} from '../controllers/medicinePrescriptionController.js';

const router = express.Router();

router.get('/', authenticate, authorize('ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'DOCTOR', 'PHARMACIST'), listPrescriptions);
router.get('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'DOCTOR', 'PHARMACIST'), getPrescriptionById);
router.post('/', authenticate, authorize('ADMIN', 'SUPERADMIN', 'DOCTOR', 'PHARMACIST'), validate(createPrescriptionSchema), createPrescription);
router.put('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN', 'DOCTOR', 'PHARMACIST'), validate(updatePrescriptionSchema), updatePrescription);
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN', 'DOCTOR', 'PHARMACIST'), deletePrescription);

export default router;
