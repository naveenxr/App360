const EventService = require('../services/EventService');
const correlationService = require('../services/correlationService');
const { sendSuccess } = require('../utils/response');

class CorrelationController {
  async getCorrelationStats(req, res, next) {
    try {
      const stats = await EventService.getCorrelationStats();
      return sendSuccess(res, stats, 'Correlation statistics retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  async processCorrelation(req, res, next) {
    try {
      const result = await correlationService.processUnlinkedAlarms();
      return sendSuccess(res, result, 'Batch alarm correlation executed successfully', 200);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CorrelationController();

