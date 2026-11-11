const BaseRepository = require('./BaseRepository');
const Site = require('../models/Site');

class SiteRepository extends BaseRepository {
  constructor() {
    super(Site);
  }

  async findBySiteId(siteId) {
    return await this.model.findOne({ siteId: String(siteId).toUpperCase().trim() });
  }

  async listSites(filter = {}, options = {}) {
    const { sort = { siteId: 1 } } = options;
    return await this.model.find(filter).sort(sort);
  }

  async updateSeverity(siteId, currentSeverity, activeAlarmCount) {
    return await this.model.findOneAndUpdate(
      { siteId: String(siteId).toUpperCase().trim() },
      { $set: { currentSeverity, activeAlarmCount } },
      { new: true }
    );
  }
}

module.exports = new SiteRepository();

