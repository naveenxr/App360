const AlarmRepository = require('../repositories/AlarmRepository');

class AlarmService {
  async listAlarms(queryFilters = {}, options = {}) {
    const filter = {};

    if (queryFilters.severity) {
      filter.severity = String(queryFilters.severity).toUpperCase();
    }

    if (queryFilters.sourceId) {
      filter.sourceId = String(queryFilters.sourceId).trim();
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
      filter.timestamp = {};
      if (queryFilters.startDate) {
        filter.timestamp.$gte = new Date(queryFilters.startDate);
      }
      if (queryFilters.endDate) {
        filter.timestamp.$lte = new Date(queryFilters.endDate);
      }
    }

    const page = parseInt(options.page, 10) || 1;
    const limit = parseInt(options.limit, 10) || 50;

    return await AlarmRepository.listAlarms(filter, { page, limit });
  }

  async getAlarmById(id) {
    const alarm = await AlarmRepository.findById(id);
    if (!alarm) {
      const error = new Error(`Alarm with ID [${id}] not found`);
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }
    return alarm;
  }

  async getAlarmRawPayload(id) {
    const alarm = await AlarmRepository.findByIdWithRaw(id);
    if (!alarm) {
      const error = new Error(`Alarm with ID [${id}] not found`);
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    return {
      alarmId: alarm._id,
      sourceId: alarm.sourceId,
      externalAlarmId: alarm.externalAlarmId,
      ingestedAt: alarm.ingestedAt,
      rawPayload: alarm.rawPayload,
      rawPayloadAudit: alarm.rawPayloadId || null
    };
  }
}

module.exports = new AlarmService();
