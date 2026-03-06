import express from 'express';
import {
    createAppointment,
    getAppointments,
    getAppointmentById,
    updateAppointment,
    deleteAppointment,
    getAppointmentStats
} from '../controllers/appointmentController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import validate from '../middlewares/validate.js';
import { appointmentSchema, updateAppointmentSchema } from '../middlewares/validationSchemas.js';

const router = express.Router();

router.get('/', authenticate, authorize('ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'DOCTOR', 'OPTICIAN', 'PHARMACIST'), getAppointments);
router.get('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'DOCTOR', 'OPTICIAN', 'PHARMACIST'), getAppointmentById);
// Stats: same roles that can view the list (so dashboard cards load without 403)
router.get('/stats', authenticate, authorize('ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'DOCTOR', 'OPTICIAN', 'PHARMACIST'), getAppointmentStats);

router.post('/', authenticate, authorize('ADMIN', 'SUPERADMIN', 'RECEPTIONIST'), validate(appointmentSchema), createAppointment);
router.put('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN', 'RECEPTIONIST'), validate(updateAppointmentSchema), updateAppointment);
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN', 'RECEPTIONIST'), deleteAppointment);

export default router;
