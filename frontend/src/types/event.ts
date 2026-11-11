import { Alarm, SeverityLevel } from './alarm';

export type EventStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';

export interface StatusHistoryEntry {
  status: EventStatus;
  changedBy?: { id: string; name: string; email: string } | string | null;
  changedAt: string;
  notes?: string;
}

export interface CorrelatedEvent {
  id: string;
  eventId: string;
  siteId: string;
  deviceId: string;
  alarmIds: string[] | Alarm[];
  correlationRule: string;
  severity: SeverityLevel;
  status: EventStatus;
  firstOccurredAt: string;
  lastOccurredAt: string;
  notes?: string;
  statusHistory?: StatusHistoryEntry[];
  acknowledgedBy?: { id: string; name: string; email: string } | null;
  acknowledgedAt?: string | null;
  resolvedBy?: { id: string; name: string; email: string } | null;
  resolvedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface EventFilters {
  severity?: string;
  siteId?: string;
  deviceId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface CorrelationStats {
  totalEvents: number;
  openEvents: number;
  acknowledgedEvents: number;
  resolvedEvents: number;
  totalAlarms: number;
  noiseReductionRatio: string;
  noiseReductionPercent: number;
  severityCounts: {
    CRITICAL: number;
    MAJOR: number;
    MINOR: number;
    WARNING: number;
    INFO: number;
  };
}

