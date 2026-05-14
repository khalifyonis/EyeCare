import express from 'express';
import {
    listBillings,
    getBillingStats,
    getBillingById,
    createBilling,
    updateBilling,
    deleteBilling,
    getUnbilledItems,
} from '../controllers/billingController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import validate from '../middlewares/validate.js';
import { createBillingSchema, updateBillingSchema } from '../middlewares/validationSchemas.js';

const router = express.Router();

router.get('/', authenticate, authorize('ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'DOCTOR', 'OPTICIAN', 'PHARMACIST'), listBillings);
router.get('/stats', authenticate, authorize('ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'DOCTOR', 'OPTICIAN', 'PHARMACIST'), getBillingStats);
router.get('/unbilled/:patientId', authenticate, authorize('ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'PHARMACIST'), getUnbilledItems);
router.get('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'DOCTOR', 'OPTICIAN', 'PHARMACIST'), getBillingById);

router.post('/', authenticate, authorize('ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'PHARMACIST'), validate(createBillingSchema), createBilling);
router.put('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'PHARMACIST'), validate(updateBillingSchema), updateBilling);
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'PHARMACIST'), deleteBilling);

export default router;
