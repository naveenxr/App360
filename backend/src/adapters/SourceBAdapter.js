const BaseAdapter = require('./BaseAdapter');
const mockSourcesService = require('../services/mockSources.service');
const config = require('../config/env');

class SourceBAdapter extends BaseAdapter {
  constructor(endpointUrl = `http://127.0.0.1:${config.PORT}/api/mock/source-b`) {
    super('SOURCE_B', endpointUrl);
  }

  async fetchRawData(options = {}) {
    try {
      if (options.useDirectService) {
        return mockSourcesService.getSourceBData(options.simulateFailure);
      }

      const response = await this.client.get(this.endpointUrl, {
        params: { simulateFailure: options.simulateFailure ? 'true' : 'false' }
      });

      if (!Array.isArray(response.data)) {
        throw new Error('Source B returned non-array payload');
      }

      return response.data;
    } catch (error) {
      if (options.useDirectService || error.code === 'ECONNREFUSED') {
        return mockSourcesService.getSourceBData(options.simulateFailure);
      }
      throw new Error(`Source B fetch error: ${error.message}`);
    }
  }

  transform(rawItem) {
    if (!rawItem || typeof rawItem !== 'object') {
      throw new Error('Source B raw item must be an object');
    }

    const incident = rawItem.incident || {};

    return {
      sourceId: this.sourceId,
      externalAlarmId: incident.id,
      siteId: incident.site,
      deviceId: incident.device,
      alarmType: incident.category,
      severity: incident.priority,
      message: incident.details,
      timestamp: incident.created_at,
      status: 'ACTIVE',
      rawPayload: rawItem
    };
  }
}

module.exports = new SourceBAdapter();

