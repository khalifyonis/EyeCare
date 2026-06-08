import express from 'express';
import { authenticate, checkPermission, restrictOptometrist } from '../middlewares/authMiddleware.js';
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

router.get('/', authenticate, checkPermission('medicine_prescriptions', 'canRead'), listPrescriptions);
router.get('/:id', authenticate, checkPermission('medicine_prescriptions', 'canRead'), getPrescriptionById);
router.post('/', authenticate, restrictOptometrist, checkPermission('medicine_prescriptions', 'canCreate'), validate(createPrescriptionSchema), createPrescription);
router.post('/:id/dispense', authenticate, checkPermission('medicine_prescriptions', 'canUpdate'), dispenseMedicine);
router.put('/:id', authenticate, restrictOptometrist, checkPermission('medicine_prescriptions', 'canUpdate'), validate(updatePrescriptionSchema), updatePrescription);
router.delete('/:id', authenticate, restrictOptometrist, checkPermission('medicine_prescriptions', 'canDelete'), deletePrescription);

export default router;
