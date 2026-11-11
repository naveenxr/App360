const IngestionService = require('../services/IngestionService');
const { isSchedulerRunning } = require('../jobs/ingestion.job');
const { sendSuccess } = require('../utils/response');

class IngestionController {
  async triggerIngestion(req, res, next) {
    try {
      const summary = await IngestionService.executeIngestion({
        triggeredBy: 'MANUAL',
        triggeredByEmail: req.user?.email || null
      });
      return sendSuccess(res, summary, 'Multi-source ingestion cycle executed successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  async getIngestionStatus(req, res, next) {
    try {
      const statusData = await IngestionService.getIngestionStatus();
      return sendSuccess(
        res,
        {
          ...statusData,
          schedulerActive: isSchedulerRunning()
        },
        'Ingestion status retrieved successfully',
        200
      );
    } catch (error) {
      next(error);
    }
  }

  async getIngestionLogs(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;

      const result = await IngestionService.listIngestionLogs({ page, limit });
      return sendSuccess(res, result.logs, 'Ingestion logs retrieved successfully', 200, {
        page: result.page,
        limit,
        total: result.total,
        totalPages: result.totalPages
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new IngestionController();
