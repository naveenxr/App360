/**
 * Centralized Socket.IO Event Naming Conventions
 * Enterprise App360 Real-Time Event Architecture
 */

const SERVER_EVENTS = {
  CONNECTION_ESTABLISHED: 'connection:established',
  SYSTEM_STATUS: 'system:status',
  ALARM_NEW: 'alarm:new',
  ALARM_UPDATED: 'alarm:updated',
  INCIDENT_CREATED: 'incident:created',
  INCIDENT_UPDATED: 'incident:updated',
  DEVICE_STATUS: 'device:status',
  NOTIFICATION_NEW: 'notification:new'
};

const CLIENT_EVENTS = {
  HEARTBEAT: 'client:heartbeat',
  SUBSCRIBE: 'client:subscribe',
  UNSUBSCRIBE: 'client:unsubscribe'
};

const ROOMS = {
  USER_PREFIX: 'user:',
  ROLE_PREFIX: 'role:',
  MONITORING_ALARMS: 'monitoring:alarms',
  MONITORING_EVENTS: 'monitoring:events',
  MONITORING_TOPOLOGY: 'monitoring:topology',
  MONITORING_SYSTEM: 'monitoring:system'
};

module.exports = {
  SERVER_EVENTS,
  CLIENT_EVENTS,
  ROOMS
};

