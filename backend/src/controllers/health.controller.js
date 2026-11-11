const healthService = require('../services/health.service');
const { checkDatabaseHealth } = require('../config/database');

/**
 * Health Controller
 * Orchestrates incoming HTTP requests and verifies database connectivity independently.
 * Never exposes database URIs, credentials, or internal stack traces.
 */
class HealthController {
  async getHealth(req, res, next) {
    try {
      const healthData = healthService.getHealthStatus();
      const dbHealth = await checkDatabaseHealth();
      const isHealthy = dbHealth.connected;

      return res.status(isHealthy ? 200 : 503).json({
        success: isHealthy,
        message: isHealthy
          ? 'App360 Backend is running'
          : 'App360 Backend is running but database is disconnected',
        status: isHealthy ? 'healthy' : 'degraded',
        database: isHealthy ? 'connected' : 'disconnected',
        environment: healthData.environment,
        uptime: healthData.uptime,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new HealthController();
