import express from 'express';
import {
    getAllRoles,
    createRole,
    updateRole,
    deleteRole
} from '../controllers/roleController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticate);

// Allow any authenticated staff to retrieve the dynamic list of roles
router.get('/', getAllRoles);

// Admin-only operations for creating/deleting custom roles
router.post('/', authorize('ADMIN', 'SUPERADMIN'), createRole);
router.put('/:id', authorize('ADMIN', 'SUPERADMIN'), updateRole);
router.delete('/:id', authorize('ADMIN', 'SUPERADMIN'), deleteRole);

export default router;
