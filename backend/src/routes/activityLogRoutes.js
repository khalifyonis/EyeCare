import express from 'express';
import { listActivityLogs } from '../controllers/activityLogController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticate, authorize('ADMIN', 'SUPERADMIN'));
router.get('/', listActivityLogs);

export default router;
