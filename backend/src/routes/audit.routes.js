const express = require('express');
const AuditLogController = require('../controllers/AuditLogController');
const authenticate = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');

const router = express.Router();

router.use(authenticate);
// Accessible by users with audit:read permission or ADMIN
router.use(requirePermission('audit', 'read'));

// GET /api/audit-logs - List administrative audit logs
router.get('/', (req, res, next) => AuditLogController.getAuditLogs(req, res, next));

module.exports = router;
