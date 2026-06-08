import express from 'express';
import {
    listActivityLogs,
    getActivityLogFilters,
    getActivityLogStats,
    exportActivityLogs,
} from '../controllers/activityLogController.js';
import { authenticate, checkPermission } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticate, checkPermission('logs', 'canRead'));

router.get('/filters', getActivityLogFilters);
router.get('/stats', getActivityLogStats);
router.get('/export', exportActivityLogs);
router.get('/', listActivityLogs);

export default router;
