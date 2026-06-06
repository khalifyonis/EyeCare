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
import { authenticate, checkPermission } from '../middlewares/authMiddleware.js';
import validate from '../middlewares/validate.js';
import { createBillingSchema, updateBillingSchema } from '../middlewares/validationSchemas.js';

const router = express.Router();

router.get('/', authenticate, checkPermission('billing', 'canRead'), listBillings);
router.get('/stats', authenticate, checkPermission('billing', 'canRead'), getBillingStats);
router.get('/unbilled/:patientId', authenticate, checkPermission('billing', 'canRead'), getUnbilledItems);
router.get('/:id', authenticate, checkPermission('billing', 'canRead'), getBillingById);

router.post('/', authenticate, checkPermission('billing', 'canCreate'), validate(createBillingSchema), createBilling);
router.put('/:id', authenticate, checkPermission('billing', 'canUpdate'), validate(updateBillingSchema), updateBilling);
router.delete('/:id', authenticate, checkPermission('billing', 'canDelete'), deleteBilling);

export default router;
