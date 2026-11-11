const BaseRepository = require('./BaseRepository');
const IngestionLog = require('../models/IngestionLog');

class IngestionLogRepository extends BaseRepository {
  constructor() {
    super(IngestionLog);
  }

  async createLog(logData) {
    return await this.model.create(logData);
  }

  async listLogs(options = {}) {
    const { page = 1, limit = 20, sort = { startedAt: -1 } } = options;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.model.find({}).sort(sort).skip(skip).limit(limit),
      this.model.countDocuments({})
    ]);

    return {
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getLatestLog() {
    return await this.model.findOne({}).sort({ startedAt: -1 });
  }
}

module.exports = new IngestionLogRepository();

