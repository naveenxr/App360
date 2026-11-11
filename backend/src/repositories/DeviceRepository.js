const BaseRepository = require('./BaseRepository');
const Device = require('../models/Device');

class DeviceRepository extends BaseRepository {
  constructor() {
    super(Device);
  }

  async findByDeviceId(deviceId) {
    return await this.model.findOne({ deviceId: String(deviceId).toUpperCase().trim() });
  }

  async findBySite(siteId) {
    return await this.model.find({ siteId: String(siteId).toUpperCase().trim() });
  }

  async listDevices(filter = {}, options = {}) {
    const { sort = { deviceId: 1 } } = options;
    return await this.model.find(filter).sort(sort);
  }

  async updateSeverity(deviceId, currentSeverity, status = null) {
    const update = { currentSeverity };
    if (status) {
      update.status = status;
    }
    return await this.model.findOneAndUpdate(
      { deviceId: String(deviceId).toUpperCase().trim() },
      { $set: update },
      { new: true }
    );
  }
}

module.exports = new DeviceRepository();

