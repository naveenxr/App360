const express = require('express');
const AlarmController = require('../controllers/AlarmController');
const authenticate = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');

const router = express.Router();

// All alarm endpoints require authentication and alarm:read permission
router.use(authenticate);
router.use(requirePermission('alarm', 'read'));

// GET /api/alarms - List normalized alarms with filters and pagination
router.get('/', (req, res, next) => AlarmController.getAlarms(req, res, next));

// GET /api/alarms/:id - Get specific alarm details
router.get('/:id', (req, res, next) => AlarmController.getAlarmById(req, res, next));

// GET /api/alarms/:id/raw - Drill-down to original raw wire payload
router.get('/:id/raw', (req, res, next) => AlarmController.getAlarmRawPayload(req, res, next));

module.exports = router;

