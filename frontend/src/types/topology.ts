import { Alarm, SeverityLevel } from './alarm';
import { CorrelatedEvent } from './event';

export type SiteStatus = 'ACTIVE' | 'MAINTENANCE' | 'OFFLINE';
export type DeviceStatus = 'ONLINE' | 'DEGRADED' | 'OFFLINE';
export type DeviceType = 'ROUTER' | 'SWITCH' | 'FIREWALL' | 'BASE_STATION' | 'POWER_SUPPLY';

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

export interface Site {
  id: string;
  siteId: string;
  name: string;
  region: string;
  coordinates: GeoCoordinates;
  address?: string;
  status: SiteStatus;
  currentSeverity: SeverityLevel | 'CLEAR';
  activeAlarmCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Device {
  id: string;
  deviceId: string;
  siteId: string;
  name: string;
  type: DeviceType;
  ipAddress: string;
  status: DeviceStatus;
  currentSeverity: SeverityLevel | 'CLEAR';
  createdAt?: string;
  updatedAt?: string;
}

export interface NodeLiveAlarmsResponse {
  node: Device;
  activeAlarmCount: number;
  activeAlarms: Alarm[];
  linkedCorrelatedEvent: CorrelatedEvent | null;
}

export interface TopologySummary {
  totalSites: number;
  totalDevices: number;
  activeAlarms: number;
  openCorrelatedEvents: number;
  severityBreakdown: {
    CRITICAL: number;
    MAJOR: number;
    MINOR: number;
    WARNING: number;
    CLEAR: number;
  };
}

export interface TopologyFilters {
  region?: string;
  severity?: string;
  status?: string;
  siteId?: string;
  type?: string;
}

