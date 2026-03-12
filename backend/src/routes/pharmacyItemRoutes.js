import express from 'express';
import {
    listPharmacyItems,
    getPharmacyItemById,
    createPharmacyItem,
    updatePharmacyItem,
    deletePharmacyItem,
    getPharmacyStats,
    receivePharmacyStock,
} from '../controllers/pharmacyItemController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import validate from '../middlewares/validate.js';
import { createPharmacyItemSchema, updatePharmacyItemSchema } from '../middlewares/validationSchemas.js';

const router = express.Router();

router.get('/', authenticate, authorize('ADMIN', 'SUPERADMIN', 'PHARMACIST'), listPharmacyItems);
router.get('/stats', authenticate, authorize('ADMIN', 'SUPERADMIN', 'PHARMACIST'), getPharmacyStats);
router.get('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN', 'PHARMACIST'), getPharmacyItemById);

router.post('/', authenticate, authorize('ADMIN', 'SUPERADMIN', 'PHARMACIST'), validate(createPharmacyItemSchema), createPharmacyItem);
router.post('/:id/receive', authenticate, authorize('ADMIN', 'SUPERADMIN', 'PHARMACIST'), receivePharmacyStock);
router.put('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN', 'PHARMACIST'), validate(updatePharmacyItemSchema), updatePharmacyItem);
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN', 'PHARMACIST'), deletePharmacyItem);

export default router;
