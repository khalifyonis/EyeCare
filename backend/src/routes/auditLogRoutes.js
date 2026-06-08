import express from 'express';
import {
    listAuditLogs,
    getAuditLogById,
    getAuditLogFilters,
    getAuditLogStats,
    exportAuditLogs,
} from '../controllers/auditLogController.js';
import { getLogsOverview } from '../controllers/activityLogController.js';
import { authenticate, checkPermission } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticate, checkPermission('logs', 'canRead'));

router.get('/overview', getLogsOverview);
router.get('/filters', getAuditLogFilters);
router.get('/stats', getAuditLogStats);
router.get('/export', exportAuditLogs);
router.get('/:id', getAuditLogById);
router.get('/', listAuditLogs);

export default router;
