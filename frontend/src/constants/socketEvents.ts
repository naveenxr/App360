/**
 * Centralized Socket.IO Event Naming Conventions
 * Enterprise App360 Real-Time Event Architecture (Frontend)
 */

export const SERVER_EVENTS = {
  CONNECTION_ESTABLISHED: 'connection:established',
  SYSTEM_STATUS: 'system:status',
  ALARM_NEW: 'alarm:new',
  ALARM_UPDATED: 'alarm:updated',
  INCIDENT_CREATED: 'incident:created',
  INCIDENT_UPDATED: 'incident:updated',
  DEVICE_STATUS: 'device:status',
  NOTIFICATION_NEW: 'notification:new'
} as const;

export const CLIENT_EVENTS = {
  HEARTBEAT: 'client:heartbeat',
  SUBSCRIBE: 'client:subscribe',
  UNSUBSCRIBE: 'client:unsubscribe'
} as const;

export const ROOMS = {
  USER_PREFIX: 'user:',
  ROLE_PREFIX: 'role:',
  MONITORING_ALARMS: 'monitoring:alarms',
  MONITORING_EVENTS: 'monitoring:events',
  MONITORING_TOPOLOGY: 'monitoring:topology',
  MONITORING_SYSTEM: 'monitoring:system'
} as const;

export type ServerEventName = (typeof SERVER_EVENTS)[keyof typeof SERVER_EVENTS];
export type ClientEventName = (typeof CLIENT_EVENTS)[keyof typeof CLIENT_EVENTS];

