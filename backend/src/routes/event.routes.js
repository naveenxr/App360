const express = require('express');
const EventController = require('../controllers/EventController');
const authenticate = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');

const router = express.Router();

// All event endpoints require authentication
router.use(authenticate);

// GET /api/events - List correlated events with filters
router.get('/', requirePermission('alarm', 'read'), (req, res, next) =>
  EventController.getEvents(req, res, next)
);

// GET /api/events/:id - Get specific event details
router.get('/:id', requirePermission('alarm', 'read'), (req, res, next) =>
  EventController.getEventById(req, res, next)
);

// GET /api/events/:id/alarms - Get member constituent alarms
router.get('/:id/alarms', requirePermission('alarm', 'read'), (req, res, next) =>
  EventController.getRelatedAlarms(req, res, next)
);

// POST /api/events/:id/acknowledge - Operator acknowledgment
router.post('/:id/acknowledge', requirePermission('alarm', 'update'), (req, res, next) =>
  EventController.acknowledgeEvent(req, res, next)
);

// POST /api/events/:id/resolve - Event resolution
router.post('/:id/resolve', requirePermission('alarm', 'update'), (req, res, next) =>
  EventController.resolveEvent(req, res, next)
);

module.exports = router;

