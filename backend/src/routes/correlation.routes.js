const express = require('express');
const CorrelationController = require('../controllers/CorrelationController');
const authenticate = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');

const router = express.Router();

router.use(authenticate);

// GET /api/correlation/stats - AIOps noise reduction & correlation KPIs
router.get('/stats', requirePermission('alarm', 'read'), (req, res, next) =>
  CorrelationController.getCorrelationStats(req, res, next)
);

// POST /api/correlation/process - Batch process unlinked alarms
router.post('/process', requirePermission('alarm', 'update'), (req, res, next) =>
  CorrelationController.processCorrelation(req, res, next)
);

module.exports = router;
