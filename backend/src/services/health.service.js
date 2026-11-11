/**
 * Health Service
 * Encapsulates domain logic for system health status evaluation.
 * Does not interact directly with HTTP request or response objects.
 */
class HealthService {
  /**
   * Retrieves current backend health information
   * @returns {Object} Health status details
   */
  getHealthStatus() {
    const uptimeInSeconds = Math.floor(process.uptime());
    const memoryUsage = process.memoryUsage();

    return {
      status: 'healthy',
      service: 'App360 Network Monitoring and Alarm Management API',
      uptime: `${uptimeInSeconds}s`,
      memory: {
        heapUsedMB: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100,
        heapTotalMB: Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100
      },
      environment: process.env.NODE_ENV || 'development'
    };
  }
}

module.exports = new HealthService();
