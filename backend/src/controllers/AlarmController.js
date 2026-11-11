const AlarmService = require('../services/AlarmService');
const { sendSuccess } = require('../utils/response');

class AlarmController {
  async getAlarms(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 50;

      const filters = {
        severity: req.query.severity,
        sourceId: req.query.sourceId,
        siteId: req.query.siteId,
        deviceId: req.query.deviceId,
        status: req.query.status,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const result = await AlarmService.listAlarms(filters, { page, limit });

      return sendSuccess(res, result.alarms, 'Alarms retrieved successfully', 200, {
        page: result.page,
        limit,
        total: result.total,
        totalPages: result.totalPages
      });
    } catch (error) {
      next(error);
    }
  }

  async getAlarmById(req, res, next) {
    try {
      const alarm = await AlarmService.getAlarmById(req.params.id);
      return sendSuccess(res, alarm, 'Alarm retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  async getAlarmRawPayload(req, res, next) {
    try {
      const rawDetails = await AlarmService.getAlarmRawPayload(req.params.id);
      return sendSuccess(res, rawDetails, 'Raw alarm payload retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  async getAlarmStats(req, res, next) {
    try {
      const stats = await AlarmService.getAlarmStats();
      return sendSuccess(res, stats, 'Alarm statistics retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AlarmController();

