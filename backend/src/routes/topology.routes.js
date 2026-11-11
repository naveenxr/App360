const express = require('express');
const TopologyController = require('../controllers/TopologyController');
const authenticate = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');

const router = express.Router();

router.use(authenticate);

// GET /api/topology/sites - Query sites with rollup severities & filters (?region=&severity=)
router.get('/sites', requirePermission('map', 'read'), (req, res, next) =>
  TopologyController.getSites(req, res, next)
);

// GET /api/topology/sites/:id - Get specific site and hardware inventory
router.get('/sites/:id', requirePermission('map', 'read'), (req, res, next) =>
  TopologyController.getSiteById(req, res, next)
);

// GET /api/topology/nodes - Query devices/nodes (?siteId=&type=&severity=)
router.get('/nodes', requirePermission('map', 'read'), (req, res, next) =>
  TopologyController.getNodes(req, res, next)
);

// GET /api/topology/nodes/:id/alarms - Dynamic map marker selection endpoint (live alarms & linked event)
router.get('/nodes/:id/alarms', requirePermission('map', 'read'), (req, res, next) =>
  TopologyController.getNodeAlarms(req, res, next)
);

// GET /api/topology/summary - Network topology KPI summary
router.get('/summary', requirePermission('map', 'read'), (req, res, next) =>
  TopologyController.getSummary(req, res, next)
);

module.exports = router;
