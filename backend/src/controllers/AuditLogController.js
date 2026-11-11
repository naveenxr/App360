const AuditLogService = require('../services/AuditLogService');
const { sendSuccess } = require('../utils/response');

class AuditLogController {
  async getAuditLogs(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 50;

      const filters = {
        action: req.query.action,
        targetType: req.query.targetType,
        search: req.query.search,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const result = await AuditLogService.listLogs(filters, { page, limit });

      return sendSuccess(res, result.logs, 'Audit logs retrieved successfully', 200, {
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

module.exports = new AuditLogController();
