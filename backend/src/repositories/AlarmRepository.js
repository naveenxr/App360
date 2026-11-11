const BaseRepository = require('./BaseRepository');
const Alarm = require('../models/Alarm');

class AlarmRepository extends BaseRepository {
  constructor() {
    super(Alarm);
  }

  async findBySourceAndExternalId(sourceId, externalAlarmId) {
    return await this.model.findOne({ sourceId, externalAlarmId });
  }

  /**
   * Idempotently saves or updates an alarm.
   * If alarm with same (sourceId, externalAlarmId) exists, increments repeatCount
   * without overwriting original rawPayload.
   * 
   * @param {Object} canonicalAlarm 
   * @param {string} rawPayloadId 
   * @returns {Promise<{ alarm: Object, isNew: boolean }>}
   */
  async upsertAlarm(canonicalAlarm, rawPayloadId = null) {
    const existing = await this.model.findOne({
      sourceId: canonicalAlarm.sourceId,
      externalAlarmId: canonicalAlarm.externalAlarmId
    });

    if (existing) {
      // Duplicate alarm arrived: increment repeat count, update timestamp
      existing.repeatCount += 1;
      existing.status = 'ACTIVE';
      await existing.save();
      return { alarm: existing, isNew: false };
    }

    // New unique alarm
    const newAlarm = await this.model.create({
      sourceId: canonicalAlarm.sourceId,
      externalAlarmId: canonicalAlarm.externalAlarmId,
      siteId: canonicalAlarm.siteId,
      deviceId: canonicalAlarm.deviceId,
      alarmType: canonicalAlarm.alarmType,
      severity: canonicalAlarm.severity,
      message: canonicalAlarm.message,
      timestamp: canonicalAlarm.timestamp,
      status: canonicalAlarm.status || 'ACTIVE',
      rawPayload: canonicalAlarm.rawPayload,
      rawPayloadId: rawPayloadId,
      repeatCount: 1,
      ingestedAt: new Date()
    });

    return { alarm: newAlarm, isNew: true };
  }

  async listAlarms(filter = {}, options = {}) {
    const { page = 1, limit = 50, sort = { timestamp: -1 } } = options;
    const skip = (page - 1) * limit;

    const [alarms, total] = await Promise.all([
      this.model
        .find(filter)
        .populate('rawPayloadId')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      this.model.countDocuments(filter)
    ]);

    return {
      alarms,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async findByIdWithRaw(id) {
    return await this.model.findById(id).populate('rawPayloadId');
  }

  /**
   * Aggregates real alarm statistics directly from MongoDB
   * @returns {Promise<Object>}
   */
  async getStats() {
    const [totalAlarms, activeAlarms, acknowledgedAlarms, clearedAlarms, severityStats] = await Promise.all([
      this.model.countDocuments({}),
      this.model.countDocuments({ status: 'ACTIVE' }),
      this.model.countDocuments({ status: 'ACKNOWLEDGED' }),
      this.model.countDocuments({ status: 'CLEARED' }),
      this.model.aggregate([
        { $group: { _id: '$severity', count: { $sum: 1 } } }
      ])
    ]);

    const severityCounts = {
      CRITICAL: 0,
      MAJOR: 0,
      MINOR: 0,
      WARNING: 0,
      INFO: 0
    };

    severityStats.forEach((s) => {
      if (severityCounts.hasOwnProperty(s._id)) {
        severityCounts[s._id] = s.count;
      }
    });

    return {
      totalAlarms,
      activeAlarms,
      acknowledgedAlarms,
      clearedAlarms,
      severityCounts
    };
  }
}

module.exports = new AlarmRepository();

