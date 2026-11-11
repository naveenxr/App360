export type SeverityLevel = 'CRITICAL' | 'MAJOR' | 'MINOR' | 'WARNING' | 'INFO';
export type AlarmStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'CLEARED';

export interface RawAlarmPayload {
  id: string;
  sourceId: string;
  externalAlarmId: string;
  ingestionBatchId: string;
  rawPayload: Record<string, unknown>;
  checksum: string;
  ingestedAt: string;
}

export interface Alarm {
  id: string;
  sourceId: string;
  externalAlarmId: string;
  siteId: string;
  deviceId: string;
  alarmType: string;
  severity: SeverityLevel;
  message: string;
  timestamp: string;
  status: AlarmStatus;
  repeatCount: number;
  rawPayload?: Record<string, unknown>;
  rawPayloadId?: string | RawAlarmPayload;
  correlatedEventId?: string;
  ingestedAt: string;
}

export interface AlarmFilters {
  severity?: string;
  siteId?: string;
  deviceId?: string;
  status?: string;
  sourceId?: string;
  page?: number;
  limit?: number;
}

