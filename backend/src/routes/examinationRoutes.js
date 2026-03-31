import express from 'express';
import {
    getExaminations,
    getExaminationByAppointment,
    listERExaminations,
    getERExaminationById,
    createERExamination,
    updateERExamination,
    deleteERExamination,
    listClinicalExaminations,
    getClinicalExaminationById,
    createClinicalExamination,
    updateClinicalExamination,
    deleteClinicalExamination,
    upsertERExamination,
    upsertClinicalExamination
} from '../controllers/examinationController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import validate from '../middlewares/validate.js';
import {
    erExaminationSchema,
    clinicalExaminationSchema,
    updateERExaminationSchema,
    updateClinicalExaminationSchema
} from '../middlewares/validationSchemas.js';

const router = express.Router();

router.get('/', authenticate, authorize('ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'DOCTOR', 'OPTICIAN', 'PHARMACIST'), getExaminations);
router.get('/appointment/:appointmentId', authenticate, authorize('ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'DOCTOR', 'OPTICIAN', 'PHARMACIST'), getExaminationByAppointment);

router.get('/er', authenticate, authorize('ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'DOCTOR', 'OPTICIAN', 'PHARMACIST'), listERExaminations);
router.get('/er/:id', authenticate, authorize('ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'DOCTOR', 'OPTICIAN', 'PHARMACIST'), getERExaminationById);
router.post('/er', authenticate, authorize('ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'DOCTOR'), validate(erExaminationSchema), createERExamination);
router.put('/er/:id', authenticate, authorize('ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'DOCTOR'), validate(updateERExaminationSchema), updateERExamination);
router.delete('/er/:id', authenticate, authorize('ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'DOCTOR'), deleteERExamination);

router.get('/clinical', authenticate, authorize('ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'DOCTOR', 'OPTICIAN', 'PHARMACIST'), listClinicalExaminations);
router.get('/clinical/:id', authenticate, authorize('ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'DOCTOR', 'OPTICIAN', 'PHARMACIST'), getClinicalExaminationById);
router.post('/clinical', authenticate, authorize('ADMIN', 'SUPERADMIN', 'DOCTOR'), validate(clinicalExaminationSchema), createClinicalExamination);
router.put('/clinical/:id', authenticate, authorize('ADMIN', 'SUPERADMIN', 'DOCTOR'), validate(updateClinicalExaminationSchema), updateClinicalExamination);
router.delete('/clinical/:id', authenticate, authorize('ADMIN', 'SUPERADMIN', 'DOCTOR'), deleteClinicalExamination);

router.post('/er/upsert', authenticate, authorize('ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'DOCTOR'), validate(erExaminationSchema), upsertERExamination);
router.post('/clinical/upsert', authenticate, authorize('ADMIN', 'SUPERADMIN', 'DOCTOR'), validate(clinicalExaminationSchema), upsertClinicalExamination);

export default router;
