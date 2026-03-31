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

router.use(authenticate, authorize('ADMIN', 'SUPERADMIN', 'PHARMACIST', 'OPTICIAN'));

router.get('/', listSuppliers);
router.get('/:id', getSupplierById);
router.post('/', createSupplier);
router.put('/:id', updateSupplier);
router.delete('/:id', deleteSupplier);

export default router;
