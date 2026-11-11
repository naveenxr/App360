import { SeverityLevel } from './alarm';

export interface DashboardSummary {
  totalAlarms: number;
  activeAlarms: number;
  totalEvents: number;
  openEvents: number;
  noiseReductionPercent: number;
  severityDistribution: Record<SeverityLevel, number>;
}
