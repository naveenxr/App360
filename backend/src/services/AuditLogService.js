const AuditLogRepository = require('../repositories/AuditLogRepository');

class AuditLogService {
  /**
   * Records an immutable administrative audit event
   * 
   * @param {Object} actor - Authenticated User document or { _id, name, email }
   * @param {string} action - Audit action type
   * @param {string} targetType - USER | ROLE | PERMISSION
   * @param {string} targetId - Identifier of target entity
   * @param {string} targetName - Human readable name of target entity
   * @param {Object|null} previousValues - Pre-change state
   * @param {Object|null} updatedValues - Post-change state
   * @param {Object|null} req - Express request object for IP and User-Agent extraction
   * @returns {Promise<Object>}
   */
  async recordLog({
    actor,
    action,
    targetType,
    targetId = null,
    targetName = '',
    previousValues = null,
    updatedValues = null,
    req = null
  }) {
    try {
      const actorId = actor?._id || actor?.id;
      const actorName = actor?.name || 'System';
      const actorEmail = actor?.email || 'system@app360.internal';

      let ipAddress = null;
      let userAgent = null;

      if (req) {
        ipAddress =
          req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
          req.socket?.remoteAddress ||
          req.ip ||
          '127.0.0.1';
        userAgent = req.headers['user-agent'] || null;
      }

      return await AuditLogRepository.createLog({
        actorId,
        actorName,
        actorEmail,
        action,
        targetType,
        targetId: targetId ? targetId.toString() : null,
        targetName,
        previousValues,
        updatedValues,
        ipAddress,
        userAgent,
        timestamp: new Date()
      });
    } catch (err) {
      // Do not block primary administrative operations if audit write experiences isolated issue
      console.error('⚠️ Failed to record administrative audit log:', err.message);
      return null;
    }
  }

  async listLogs(queryFilters = {}, options = {}) {
    const filter = {};

    if (queryFilters.action) {
      filter.action = String(queryFilters.action).toUpperCase().trim();
    }

    if (queryFilters.targetType) {
      filter.targetType = String(queryFilters.targetType).toUpperCase().trim();
    }

    if (queryFilters.search) {
      const searchRegex = { $regex: queryFilters.search.trim(), $options: 'i' };
      filter.$or = [
        { actorName: searchRegex },
        { actorEmail: searchRegex },
        { targetName: searchRegex },
        { action: searchRegex }
      ];
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

    return await AuditLogRepository.listLogs(filter, { page, limit });
  }
}

module.exports = new AuditLogService();
