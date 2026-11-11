const BaseRepository = require('./BaseRepository');
const AuditLog = require('../models/AuditLog');

class AuditLogRepository extends BaseRepository {
  constructor() {
    super(AuditLog);
  }

  async createLog(logData) {
    return await this.model.create(logData);
  }

  async listLogs(filter = {}, options = {}) {
    const { page = 1, limit = 50, sort = { timestamp: -1 } } = options;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.model
        .find(filter)
        .populate('actorId', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      this.model.countDocuments(filter)
    ]);

    return {
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }
}

module.exports = new AuditLogRepository();

