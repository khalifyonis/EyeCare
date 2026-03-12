import express from 'express';
import {
    listOpticalItems,
    getOpticalItemById,
    createOpticalItem,
    updateOpticalItem,
    deleteOpticalItem,
    getOpticalStats,
    receiveOpticalStock,
} from '../controllers/opticalItemController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import validate from '../middlewares/validate.js';
import { createOpticalItemSchema, updateOpticalItemSchema } from '../middlewares/validationSchemas.js';

const router = express.Router();

router.get('/', authenticate, authorize('ADMIN', 'SUPERADMIN', 'OPTICIAN'), listOpticalItems);
router.get('/stats', authenticate, authorize('ADMIN', 'SUPERADMIN', 'OPTICIAN'), getOpticalStats);
router.get('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN', 'OPTICIAN'), getOpticalItemById);

router.post('/', authenticate, authorize('ADMIN', 'SUPERADMIN', 'OPTICIAN'), validate(createOpticalItemSchema), createOpticalItem);
router.post('/:id/receive', authenticate, authorize('ADMIN', 'SUPERADMIN', 'OPTICIAN'), receiveOpticalStock);
router.put('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN', 'OPTICIAN'), validate(updateOpticalItemSchema), updateOpticalItem);
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN', 'OPTICIAN'), deleteOpticalItem);

export default router;
