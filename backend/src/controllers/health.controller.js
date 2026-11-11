const healthService = require('../services/health.service');

/**
 * Health Controller
 * Orchestrates incoming HTTP requests and delegates to HealthService.
 * Does not contain domain business logic.
 */
class HealthController {
  getHealth(req, res, next) {
    try {
      const healthData = healthService.getHealthStatus();

      return res.status(200).json({
        success: true,
        message: 'App360 Backend is running',
        status: healthData.status,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new HealthController();
