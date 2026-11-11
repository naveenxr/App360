const express = require('express');
const healthRoutes = require('./health.routes');

const router = express.Router();

// Mount health routes under /api/health
router.use('/health', healthRoutes);

module.exports = router;
