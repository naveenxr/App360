const BaseRepository = require('./BaseRepository');
const Event = require('../models/Event');

class EventRepository extends BaseRepository {
  constructor() {
    super(Event);
  }

  /**
   * Finds active (OPEN or ACKNOWLEDGED) candidate events matching exact site and device
   * @param {string} siteId 
   * @param {string} deviceId 
   * @returns {Promise<Array<Object>>}
   */
  async findCandidateEvents(siteId, deviceId) {
    return await this.model
      .find({
        siteId: siteId.toUpperCase().trim(),
        deviceId: deviceId.toUpperCase().trim(),
        status: { $in: ['OPEN', 'ACKNOWLEDGED'] }
      })
      .sort({ firstOccurredAt: 1 });
  }

  async findByEventId(eventId) {
    return await this.model.findOne({ eventId });
  }

  async findByIdWithAlarms(id) {
    return await this.model.findById(id).populate({
      path: 'alarmIds',
      populate: { path: 'rawPayloadId' }
    });
  }

  async listEvents(filter = {}, options = {}) {
    const { page = 1, limit = 50, sort = { lastOccurredAt: -1 } } = options;
    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      this.model
        .find(filter)
        .populate('acknowledgedBy', 'name email')
        .populate('resolvedBy', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      this.model.countDocuments(filter)
    ]);

    return {
      events,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getStats() {
    const [totalEvents, openEvents, ackEvents, resolvedEvents, severityStats] = await Promise.all([
      this.model.countDocuments({}),
      this.model.countDocuments({ status: 'OPEN' }),
      this.model.countDocuments({ status: 'ACKNOWLEDGED' }),
      this.model.countDocuments({ status: 'RESOLVED' }),
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
      totalEvents,
      openEvents,
      acknowledgedEvents: ackEvents,
      resolvedEvents,
      severityCounts
    };
  }
}

module.exports = new EventRepository();
