import express from 'express';
import { authenticate, checkPermission, checkAnyPermission } from '../middlewares/authMiddleware.js';
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

router.get('/stats', authenticate, checkAnyPermission(['preliminary_exams', 'clinical_exams'], 'canRead'), getEyeExaminationStats);
router.get('/', authenticate, checkAnyPermission(['preliminary_exams', 'clinical_exams'], 'canRead'), getEyeExaminations);
router.get('/:id', authenticate, checkAnyPermission(['preliminary_exams', 'clinical_exams'], 'canRead'), getEyeExaminationById);
router.post('/', authenticate, checkAnyPermission(['preliminary_exams', 'clinical_exams'], 'canCreate'), validate(createEyeExaminationSchema), createEyeExamination);
router.put('/:id', authenticate, checkAnyPermission(['preliminary_exams', 'clinical_exams'], 'canUpdate'), validate(updateEyeExaminationSchema), updateEyeExamination);
router.delete('/:id', authenticate, checkPermission('clinical_exams', 'canDelete'), deleteEyeExamination);

export default router;
