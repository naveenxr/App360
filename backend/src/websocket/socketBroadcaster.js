const { getIO } = require('./socketServer');
const { SERVER_EVENTS, ROOMS } = require('../constants/socketEvents');

/**
 * Sanitizes an alarm document into a secure, standard broadcast payload.
 * Removes internal vendor wire dumps and sensitive details.
 * 
 * @param {Object} alarm 
 * @returns {Object|null}
 */
const sanitizeAlarmPayload = (alarm) => {
  if (!alarm) return null;
  const doc = alarm.toObject ? alarm.toObject() : alarm;
  return {
    id: (doc._id || doc.id)?.toString(),
    externalAlarmId: doc.externalAlarmId,
    sourceId: doc.sourceId,
    siteId: doc.siteId,
    deviceId: doc.deviceId,
    alarmType: doc.alarmType,
    severity: doc.severity,
    message: doc.message,
    timestamp: doc.timestamp instanceof Date ? doc.timestamp.toISOString() : doc.timestamp,
    status: doc.status || 'ACTIVE',
    correlatedEventId: (doc.correlatedEventId?._id || doc.correlatedEventId)?.toString() || null,
    repeatCount: doc.repeatCount || 1
  };
};

/**
 * Sanitizes an incident/event document into a secure, standard broadcast payload.
 * 
 * @param {Object} incident 
 * @returns {Object|null}
 */
const sanitizeIncidentPayload = (incident) => {
  if (!incident) return null;
  const doc = incident.toObject ? incident.toObject() : incident;
  const alarmIds = Array.isArray(doc.alarmIds)
    ? doc.alarmIds.map((id) => (id?._id || id)?.toString())
    : [];

  return {
    id: (doc._id || doc.id)?.toString(),
    eventId: doc.eventId,
    siteId: doc.siteId,
    deviceId: doc.deviceId,
    severity: doc.severity,
    alarmCount: alarmIds.length || doc.alarmCount || 1,
    alarmIds,
    correlationRule: doc.correlationRule || 'SAME_SITE_DEVICE_5MIN',
    status: doc.status || 'OPEN',
    firstOccurredAt: doc.firstOccurredAt instanceof Date ? doc.firstOccurredAt.toISOString() : doc.firstOccurredAt,
    lastOccurredAt: doc.lastOccurredAt instanceof Date ? doc.lastOccurredAt.toISOString() : doc.lastOccurredAt,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt,
    notes: doc.notes || ''
  };
};

/**
 * Safely emits an event to one or more Socket.IO rooms.
 * Gracefully handles uninitialized Socket.IO (e.g. CLI scripts or unit tests).
 * 
 * @param {string|string[]} rooms 
 * @param {string} eventName 
 * @param {Object} payload 
 */
const safeEmit = (rooms, eventName, payload) => {
  try {
    const io = getIO();
    if (!io) return;
    const roomList = Array.isArray(rooms) ? rooms : [rooms];
    for (const room of roomList) {
      io.to(room).emit(eventName, payload);
    }
  } catch (err) {
    // Socket.IO server not running or uninitialized in this environment
  }
};

/**
 * Broadcasts newly persisted normalized alarm to authorized monitoring subscribers.
 * 
 * @param {Object} alarmDoc 
 */
const broadcastAlarmNew = (alarmDoc) => {
  const payload = sanitizeAlarmPayload(alarmDoc);
  if (!payload || !payload.id) return;

  safeEmit(
    [ROOMS.MONITORING_ALARMS, ROOMS.MONITORING_TOPOLOGY],
    SERVER_EVENTS.ALARM_NEW,
    payload
  );
};

/**
 * Broadcasts updated alarm state (e.g. status transition, cleared, acknowledged).
 * 
 * @param {Object} alarmDoc 
 */
const broadcastAlarmUpdated = (alarmDoc) => {
  const payload = sanitizeAlarmPayload(alarmDoc);
  if (!payload || !payload.id) return;

  safeEmit(
    [ROOMS.MONITORING_ALARMS, ROOMS.MONITORING_TOPOLOGY],
    SERVER_EVENTS.ALARM_UPDATED,
    payload
  );
};

/**
 * Broadcasts newly created correlated incident to authorized subscribers.
 * 
 * @param {Object} incidentDoc 
 */
const broadcastIncidentCreated = (incidentDoc) => {
  const payload = sanitizeIncidentPayload(incidentDoc);
  if (!payload || !payload.id) return;

  safeEmit(
    [ROOMS.MONITORING_EVENTS, ROOMS.MONITORING_TOPOLOGY],
    SERVER_EVENTS.INCIDENT_CREATED,
    payload
  );
};

/**
 * Broadcasts updated incident state (e.g. escalated severity, merged alarms, ACK, RESOLVE).
 * 
 * @param {Object} incidentDoc 
 */
const broadcastIncidentUpdated = (incidentDoc) => {
  const payload = sanitizeIncidentPayload(incidentDoc);
  if (!payload || !payload.id) return;

  safeEmit(
    [ROOMS.MONITORING_EVENTS, ROOMS.MONITORING_TOPOLOGY],
    SERVER_EVENTS.INCIDENT_UPDATED,
    payload
  );
};

module.exports = {
  sanitizeAlarmPayload,
  sanitizeIncidentPayload,
  broadcastAlarmNew,
  broadcastAlarmUpdated,
  broadcastIncidentCreated,
  broadcastIncidentUpdated
};

