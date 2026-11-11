const express = require('express');
const IngestionController = require('../controllers/IngestionController');
const authenticate = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');

const router = express.Router();

// All ingestion endpoints require authentication
router.use(authenticate);

// POST /api/ingestion/trigger - Trigger multi-source polling cycle
router.post('/trigger', requirePermission('api', 'create'), (req, res, next) =>
  IngestionController.triggerIngestion(req, res, next)
);

// GET /api/ingestion/status - Get current scheduler and ingestion status
router.get('/status', requirePermission('api', 'read'), (req, res, next) =>
  IngestionController.getIngestionStatus(req, res, next)
);

// GET /api/ingestion/logs - Paginated ingestion batch logs
router.get('/logs', requirePermission('api', 'read'), (req, res, next) =>
  IngestionController.getIngestionLogs(req, res, next)
);

module.exports = router;

