const BaseRepository = require('./BaseRepository');
const RawAlarmPayload = require('../models/RawAlarmPayload');

class RawAlarmPayloadRepository extends BaseRepository {
  constructor() {
    super(RawAlarmPayload);
  }

  async findByBatchId(batchId) {
    return await this.model.find({ ingestionBatchId: batchId });
  }

  async findByChecksum(checksum) {
    return await this.model.findOne({ checksum });
  }
}

module.exports = new RawAlarmPayloadRepository();

