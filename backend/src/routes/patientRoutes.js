import express from 'express';
import {
    createPatient,
    getAllPatients,
    getPatientById,
    updatePatient,
    deletePatient,
    getPatientStats // Added getPatientStats
} from '../controllers/patientController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import validate from '../middlewares/validate.js';
import { patientSchema, updatePatientSchema } from '../middlewares/validationSchemas.js';

const router = express.Router();

// All staff roles can view patients
router.get('/stats', authenticate, authorize('ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'DOCTOR'), getPatientStats);
router.get('/', authenticate, authorize('ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'DOCTOR', 'OPTICIAN', 'PHARMACIST'), getAllPatients);
router.get('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'DOCTOR', 'OPTICIAN', 'PHARMACIST'), getPatientById);

// Only creators/managers can add or remove patients
router.post('/', authenticate, authorize('ADMIN', 'SUPERADMIN', 'RECEPTIONIST'), validate(patientSchema), createPatient);
router.put('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN', 'RECEPTIONIST'), validate(updatePatientSchema), updatePatient);
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN', 'RECEPTIONIST'), deletePatient);

export default router;
