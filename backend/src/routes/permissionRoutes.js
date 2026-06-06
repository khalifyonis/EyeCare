import express from 'express';
import {
    getAllPermissions,
    getMyPermissions,
    updateRolePermissions
} from '../controllers/permissionController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticate);

// Public route to get logged-in user's active permissions
router.get('/mine', getMyPermissions);

// Admin-only management endpoints
router.get('/', authorize('ADMIN', 'SUPERADMIN'), getAllPermissions);
router.put('/', authorize('ADMIN', 'SUPERADMIN'), updateRolePermissions);

export default router;
