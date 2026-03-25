import express from 'express';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import validate from '../middlewares/validate.js';
import { createEyeExaminationSchema, updateEyeExaminationSchema } from '../middlewares/validationSchemas.js';
import {
    getEyeExaminations,
    getEyeExaminationById,
    createEyeExamination,
    updateEyeExamination,
    deleteEyeExamination,
    getEyeExaminationStats,
} from '../controllers/eyeExaminationController.js';

const router = express.Router();

router.get('/stats', authenticate, authorize('ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'DOCTOR', 'OPTICIAN', 'PHARMACIST'), getEyeExaminationStats);
router.get('/', authenticate, authorize('ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'DOCTOR', 'OPTICIAN', 'PHARMACIST'), getEyeExaminations);
router.get('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'DOCTOR', 'OPTICIAN', 'PHARMACIST'), getEyeExaminationById);
router.post('/', authenticate, authorize('ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'DOCTOR'), validate(createEyeExaminationSchema), createEyeExamination);
router.put('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'DOCTOR'), validate(updateEyeExaminationSchema), updateEyeExamination);
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN', 'DOCTOR'), deleteEyeExamination);

export default router;
