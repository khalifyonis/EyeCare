import express from 'express';
import {
    listSuppliers,
    getSupplierById,
    createSupplier,
    updateSupplier,
    deleteSupplier,
} from '../controllers/supplierController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/', authorize('ADMIN', 'SUPERADMIN', 'PHARMACIST', 'OPTICIAN'), listSuppliers);
router.get('/:id', authorize('ADMIN', 'SUPERADMIN', 'PHARMACIST', 'OPTICIAN'), getSupplierById);
router.post('/', authorize('ADMIN', 'SUPERADMIN', 'PHARMACIST', 'OPTICIAN'), createSupplier);
router.put('/:id', authorize('ADMIN', 'SUPERADMIN', 'PHARMACIST', 'OPTICIAN'), updateSupplier);
router.delete('/:id', authorize('ADMIN', 'SUPERADMIN'), deleteSupplier);

export default router;
