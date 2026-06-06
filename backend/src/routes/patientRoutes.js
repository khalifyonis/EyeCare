import express from 'express';
import {
    createPatient,
    getAllPatients,
    getPatientById,
    updatePatient,
    deletePatient,
    getPatientStats,
    getPatientEyeHistory,
} from '../controllers/patientController.js';
import { authenticate, checkPermission } from '../middlewares/authMiddleware.js';
import validate from '../middlewares/validate.js';
import { patientSchema, updatePatientSchema } from '../middlewares/validationSchemas.js';

const router = express.Router();

// Stats: same roles that can view the list (so the patients page loads without 403)
router.get('/stats', authenticate, checkPermission('patients', 'canRead'), getPatientStats);
router.get('/', authenticate, checkPermission('patients', 'canRead'), getAllPatients);
router.get('/:id/eye-history', authenticate, checkPermission('patients', 'canRead'), getPatientEyeHistory);
router.get('/:id', authenticate, checkPermission('patients', 'canRead'), getPatientById);

// Dynamic permission checks for creating/modifying/deleting patients
router.post('/', authenticate, checkPermission('patients', 'canCreate'), validate(patientSchema), createPatient);
router.put('/:id', authenticate, checkPermission('patients', 'canUpdate'), validate(updatePatientSchema), updatePatient);
router.delete('/:id', authenticate, checkPermission('patients', 'canDelete'), deletePatient);

export default router;
