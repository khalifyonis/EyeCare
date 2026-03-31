import express from 'express';
import {
    listOpticalItems,
    getOpticalItemById,
    getOpticalItemTransactions,
    listAllOpticalTransactions,
    createOpticalItem,
    updateOpticalItem,
    deleteOpticalItem,
    getOpticalStats,
    receiveOpticalStock,
    adjustOpticalStock,
} from '../controllers/opticalItemController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import validate from '../middlewares/validate.js';
import { createOpticalItemSchema, updateOpticalItemSchema } from '../middlewares/validationSchemas.js';

const router = express.Router();

router.get('/', authenticate, authorize('ADMIN', 'SUPERADMIN', 'OPTICIAN'), listOpticalItems);
router.get('/stats', authenticate, authorize('ADMIN', 'SUPERADMIN', 'OPTICIAN'), getOpticalStats);
router.get('/transactions', authenticate, authorize('ADMIN', 'SUPERADMIN', 'OPTICIAN'), listAllOpticalTransactions);
router.get('/:id/transactions', authenticate, authorize('ADMIN', 'SUPERADMIN', 'OPTICIAN'), getOpticalItemTransactions);
router.get('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN', 'OPTICIAN'), getOpticalItemById);

router.post('/', authenticate, authorize('ADMIN', 'SUPERADMIN', 'OPTICIAN'), validate(createOpticalItemSchema), createOpticalItem);
router.post('/:id/receive', authenticate, authorize('ADMIN', 'SUPERADMIN', 'OPTICIAN'), receiveOpticalStock);
router.post('/:id/adjust', authenticate, authorize('ADMIN', 'SUPERADMIN', 'OPTICIAN'), adjustOpticalStock);
router.put('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN', 'OPTICIAN'), validate(updateOpticalItemSchema), updateOpticalItem);
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN', 'OPTICIAN'), deleteOpticalItem);

export default router;
