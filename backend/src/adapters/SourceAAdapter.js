const BaseAdapter = require('./BaseAdapter');
const mockSourcesService = require('../services/mockSources.service');

class SourceAAdapter extends BaseAdapter {
  constructor(endpointUrl = 'http://localhost:5000/api/mock/source-a') {
    super('SOURCE_A', endpointUrl);
  }

  async fetchRawData(options = {}) {
    try {
      if (options.useDirectService) {
        return mockSourcesService.getSourceAData(options.simulateFailure);
      }

      const response = await this.client.get(this.endpointUrl, {
        params: { simulateFailure: options.simulateFailure ? 'true' : 'false' }
      });

      if (!Array.isArray(response.data)) {
        throw new Error('Source A returned non-array payload');
      }

      return response.data;
    } catch (error) {
      // In-process fallback for unit tests or offline execution
      if (options.useDirectService || error.code === 'ECONNREFUSED') {
        return mockSourcesService.getSourceAData(options.simulateFailure);
      }
      throw new Error(`Source A fetch error: ${error.message}`);
    }
  }

  transform(rawItem) {
    if (!rawItem || typeof rawItem !== 'object') {
      throw new Error('Source A raw item must be an object');
    }

    return {
      sourceId: this.sourceId,
      externalAlarmId: rawItem.event_id,
      siteId: rawItem.location_code,
      deviceId: rawItem.node,
      alarmType: rawItem.alarm,
      severity: rawItem.level,
      message: rawItem.description,
      timestamp: rawItem.event_time,
      status: 'ACTIVE',
      rawPayload: rawItem
    };
  }
}

module.exports = new SourceAAdapter();
