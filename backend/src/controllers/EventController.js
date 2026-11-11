const EventService = require('../services/EventService');
const { sendSuccess } = require('../utils/response');

class EventController {
  async getEvents(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 50;

      const filters = {
        severity: req.query.severity,
        siteId: req.query.siteId,
        deviceId: req.query.deviceId,
        status: req.query.status,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const result = await EventService.listEvents(filters, { page, limit });

      return sendSuccess(res, result.events, 'Correlated events retrieved successfully', 200, {
        page: result.page,
        limit,
        total: result.total,
        totalPages: result.totalPages
      });
    } catch (error) {
      next(error);
    }
  }

  async getEventById(req, res, next) {
    try {
      const event = await EventService.getEventById(req.params.id);
      return sendSuccess(res, event, 'Correlated event retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  async getRelatedAlarms(req, res, next) {
    try {
      const data = await EventService.getRelatedAlarms(req.params.id);
      return sendSuccess(res, data, 'Related constituent alarms retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  async acknowledgeEvent(req, res, next) {
    try {
      const { notes } = req.body || {};
      const userId = req.user ? req.user._id : null;
      const event = await EventService.acknowledgeEvent(req.params.id, userId, notes);
      return sendSuccess(res, event, 'Correlated event acknowledged successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  async resolveEvent(req, res, next) {
    try {
      const { notes } = req.body || {};
      const userId = req.user ? req.user._id : null;
      const event = await EventService.resolveEvent(req.params.id, userId, notes);
      return sendSuccess(res, event, 'Correlated event resolved successfully', 200);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new EventController();

