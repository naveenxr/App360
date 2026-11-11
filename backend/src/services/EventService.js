const EventRepository = require('../repositories/EventRepository');
const AlarmRepository = require('../repositories/AlarmRepository');
const correlationService = require('./correlationService');

class EventService {
  async listEvents(queryFilters = {}, options = {}) {
    const filter = {};

    if (queryFilters.severity) {
      filter.severity = String(queryFilters.severity).toUpperCase();
    }

    if (queryFilters.siteId) {
      filter.siteId = String(queryFilters.siteId).toUpperCase().trim();
    }

    if (queryFilters.deviceId) {
      filter.deviceId = String(queryFilters.deviceId).toUpperCase().trim();
    }

    if (queryFilters.status) {
      filter.status = String(queryFilters.status).toUpperCase();
    }

    if (queryFilters.startDate || queryFilters.endDate) {
      filter.firstOccurredAt = {};
      if (queryFilters.startDate) {
        filter.firstOccurredAt.$gte = new Date(queryFilters.startDate);
      }
      if (queryFilters.endDate) {
        filter.firstOccurredAt.$lte = new Date(queryFilters.endDate);
      }
    }

    const page = parseInt(options.page, 10) || 1;
    const limit = parseInt(options.limit, 10) || 50;

    return await EventRepository.listEvents(filter, { page, limit });
  }

  async getEventById(id) {
    const event = await EventRepository.findById(id);
    if (!event) {
      const error = new Error(`Correlated event with ID [${id}] not found`);
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }
    return event;
  }

  async getRelatedAlarms(eventId) {
    const event = await EventRepository.findByIdWithAlarms(eventId);
    if (!event) {
      const error = new Error(`Correlated event with ID [${eventId}] not found`);
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    return {
      eventId: event.eventId,
      siteId: event.siteId,
      deviceId: event.deviceId,
      severity: event.severity,
      status: event.status,
      firstOccurredAt: event.firstOccurredAt,
      lastOccurredAt: event.lastOccurredAt,
      alarmCount: event.alarmIds.length,
      alarms: event.alarmIds
    };
  }

  async acknowledgeEvent(id, userId, notes = '') {
    const event = await EventRepository.findById(id);
    if (!event) {
      const error = new Error(`Correlated event with ID [${id}] not found`);
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    if (event.status === 'RESOLVED') {
      const error = new Error('Cannot acknowledge an event that is already RESOLVED');
      error.statusCode = 400;
      error.code = 'INVALID_STATUS_TRANSITION';
      throw error;
    }

    event.status = 'ACKNOWLEDGED';
    event.acknowledgedBy = userId;
    event.acknowledgedAt = new Date();
    if (notes) {
      event.notes = notes;
    }

    return await event.save();
  }

  async resolveEvent(id, userId, notes = '') {
    const event = await EventRepository.findById(id);
    if (!event) {
      const error = new Error(`Correlated event with ID [${id}] not found`);
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    event.status = 'RESOLVED';
    event.resolvedBy = userId;
    event.resolvedAt = new Date();
    if (notes) {
      event.notes = notes;
    }

    // Also mark constituent alarms as CLEARED or ACKNOWLEDGED
    await AlarmRepository.model.updateMany(
      { _id: { $in: event.alarmIds } },
      { $set: { status: 'CLEARED' } }
    );

    return await event.save();
  }

  async recalculateSeverity(eventId) {
    const event = await EventRepository.findById(eventId);
    if (!event) return null;

    const constituentAlarms = await AlarmRepository.findAll({
      _id: { $in: event.alarmIds }
    });

    event.severity = correlationService.calculateAggregateSeverity(constituentAlarms);
    return await event.save();
  }

  async recalculateTimestamps(eventId) {
    const event = await EventRepository.findById(eventId);
    if (!event || event.alarmIds.length === 0) return null;

    const constituentAlarms = await AlarmRepository.findAll({
      _id: { $in: event.alarmIds }
    });

    let earliest = new Date(constituentAlarms[0].timestamp).getTime();
    let latest = earliest;

    constituentAlarms.forEach((a) => {
      const t = new Date(a.timestamp).getTime();
      earliest = Math.min(earliest, t);
      latest = Math.max(latest, t);
    });

    event.firstOccurredAt = new Date(earliest);
    event.lastOccurredAt = new Date(latest);
    return await event.save();
  }

  async getCorrelationStats() {
    const [eventStats, alarmStats] = await Promise.all([
      EventRepository.getStats(),
      AlarmRepository.getStats()
    ]);

    const totalAlarms = alarmStats.totalAlarms;
    const noiseReductionPercent =
      totalAlarms > 0
        ? Math.round(((totalAlarms - eventStats.totalEvents) / totalAlarms) * 100)
        : 0;

    return {
      ...eventStats,
      totalAlarms,
      activeAlarms: alarmStats.activeAlarms,
      alarmSeverityCounts: alarmStats.severityCounts,
      noiseReductionRatio: `${totalAlarms}:${eventStats.totalEvents}`,
      noiseReductionPercent: Math.max(0, noiseReductionPercent)
    };
  }
}

module.exports = new EventService();

