import express from 'express';
import { authenticate, authorize, restrictOptometrist } from '../middlewares/authMiddleware.js';
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
    dispenseMedicine,
} from '../controllers/medicinePrescriptionController.js';

const router = express.Router();

router.get('/', authenticate, authorize('ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'DOCTOR', 'PHARMACIST'), listPrescriptions);
router.get('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'DOCTOR', 'PHARMACIST'), getPrescriptionById);
router.post('/', authenticate, restrictOptometrist, authorize('ADMIN', 'SUPERADMIN', 'DOCTOR'), validate(createPrescriptionSchema), createPrescription);
router.post('/:id/dispense', authenticate, authorize('ADMIN', 'SUPERADMIN', 'PHARMACIST'), dispenseMedicine);
router.put('/:id', authenticate, restrictOptometrist, authorize('ADMIN', 'SUPERADMIN', 'DOCTOR'), validate(updatePrescriptionSchema), updatePrescription);
router.delete('/:id', authenticate, restrictOptometrist, authorize('ADMIN', 'SUPERADMIN', 'DOCTOR'), deletePrescription);

export default router;
