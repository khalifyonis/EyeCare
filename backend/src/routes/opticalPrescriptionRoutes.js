import express from 'express';
import { authenticate, checkPermission } from '../middlewares/authMiddleware.js';
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

router.get('/', authenticate, checkPermission('optical_prescriptions', 'canRead'), listOpticalPrescriptions);
router.get('/stats', authenticate, checkPermission('optical_prescriptions', 'canRead'), getOpticalPrescriptionStats);
router.get('/:id', authenticate, checkPermission('optical_prescriptions', 'canRead'), getOpticalPrescriptionById);
router.post('/', authenticate, checkPermission('optical_prescriptions', 'canCreate'), validate(createOpticalPrescriptionSchema), createOpticalPrescription);
router.post('/:id/dispense', authenticate, checkPermission('optical_prescriptions', 'canUpdate'), dispenseOpticalPrescription);
router.put('/:id', authenticate, checkPermission('optical_prescriptions', 'canUpdate'), validate(updateOpticalPrescriptionSchema), updateOpticalPrescription);
router.delete('/:id', authenticate, checkPermission('optical_prescriptions', 'canDelete'), deleteOpticalPrescription);

export default router;
