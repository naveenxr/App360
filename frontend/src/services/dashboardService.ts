import eventService from './eventService';
import alarmService from './alarmService';
import { DashboardSummary } from '../types/dashboard';

export const dashboardService = {
  async getDashboardSummary(): Promise<DashboardSummary> {
    try {
      const [stats, alarmStats] = await Promise.all([
        eventService.getCorrelationStats(),
        alarmService.getAlarmStats()
      ]);

      return {
        totalAlarms: alarmStats.totalAlarms || 0,
        activeAlarms: alarmStats.activeAlarms || 0,
        totalEvents: stats.totalEvents || 0,
        openEvents: stats.openEvents || 0,
        noiseReductionPercent: stats.noiseReductionPercent || 0,
        severityDistribution: (alarmStats.severityCounts as DashboardSummary['severityDistribution']) || {
          CRITICAL: 0,
          MAJOR: 0,
          MINOR: 0,
          WARNING: 0,
          INFO: 0
        }
      };
    } catch {
      return {
        totalAlarms: 0,
        activeAlarms: 0,
        totalEvents: 0,
        openEvents: 0,
        noiseReductionPercent: 0,
        severityDistribution: {
          CRITICAL: 0,
          MAJOR: 0,
          MINOR: 0,
          WARNING: 0,
          INFO: 0
        }
      };
    }
  }
};

export default dashboardService;

