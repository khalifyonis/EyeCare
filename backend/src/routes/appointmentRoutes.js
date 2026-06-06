import express from 'express';
import {
    createAppointment,
    getAppointments,
    getAppointmentById,
    updateAppointment,
    deleteAppointment,
    getAppointmentStats,
    markAsArrived
} from '../controllers/appointmentController.js';
import { authenticate, checkPermission } from '../middlewares/authMiddleware.js';
import validate from '../middlewares/validate.js';
import { appointmentSchema, updateAppointmentSchema } from '../middlewares/validationSchemas.js';

const router = express.Router();

router.get('/', authenticate, checkPermission('appointments', 'canRead'), getAppointments);
// Stats: same roles that can view the list (so dashboard cards load without 403)
router.get('/stats', authenticate, checkPermission('appointments', 'canRead'), getAppointmentStats);
router.get('/:id', authenticate, checkPermission('appointments', 'canRead'), getAppointmentById);

router.post('/', authenticate, checkPermission('appointments', 'canCreate'), validate(appointmentSchema), createAppointment);
router.put('/:id', authenticate, checkPermission('appointments', 'canUpdate'), validate(updateAppointmentSchema), updateAppointment);
router.put('/:id/arrival', authenticate, checkPermission('appointments', 'canUpdate'), markAsArrived);
router.delete('/:id', authenticate, checkPermission('appointments', 'canDelete'), deleteAppointment);

export default router;
