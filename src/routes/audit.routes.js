import { Router } from 'express';
import { requirePermission, requireAdmin } from '../middlewares/permission.middleware.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { cleanupOldLogs, getAuditLogs, getLogStatistics, getSystemLogs } from '../controllers/audit.controller.js';

const router = Router();

router.use(authenticateJWT);

router.get('/audit-logs', requirePermission('read', 'audit'), getAuditLogs);

router.get('/system-logs', requirePermission('read', 'audit'), getSystemLogs);

router.get('/stats-logs', requirePermission('read', 'audit'), getLogStatistics);

router.delete('/cleanup-logs', requireAdmin, cleanupOldLogs);

export default router;