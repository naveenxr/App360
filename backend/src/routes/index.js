const express = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const roleRoutes = require('./role.routes');
const mockRoutes = require('./mock.routes');
const ingestionRoutes = require('./ingestion.routes');
const alarmRoutes = require('./alarm.routes');
const eventRoutes = require('./event.routes');
const correlationRoutes = require('./correlation.routes');
const topologyRoutes = require('./topology.routes');

const router = express.Router();

// Mount system routes
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/roles', roleRoutes);
router.use('/mock', mockRoutes);
router.use('/ingestion', ingestionRoutes);
router.use('/alarms', alarmRoutes);
router.use('/events', eventRoutes);
router.use('/correlation', correlationRoutes);
router.use('/topology', topologyRoutes);

module.exports = router;
