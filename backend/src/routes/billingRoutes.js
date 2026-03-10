import express from 'express';
import {
    listBillings,
    getBillingStats,
    getBillingById,
    createBilling,
    updateBilling,
    deleteBilling,
} from '../controllers/billingController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import validate from '../middlewares/validate.js';
import { createBillingSchema, updateBillingSchema } from '../middlewares/validationSchemas.js';

const router = express.Router();

router.get('/', authenticate, authorize('ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'DOCTOR', 'OPTICIAN', 'PHARMACIST'), listBillings);
router.get('/stats', authenticate, authorize('ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'DOCTOR', 'OPTICIAN', 'PHARMACIST'), getBillingStats);
router.get('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'DOCTOR', 'OPTICIAN', 'PHARMACIST'), getBillingById);

router.post('/', authenticate, authorize('ADMIN', 'SUPERADMIN', 'RECEPTIONIST'), validate(createBillingSchema), createBilling);
router.put('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN', 'RECEPTIONIST'), validate(updateBillingSchema), updateBilling);
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN', 'RECEPTIONIST'), deleteBilling);

export default router;
