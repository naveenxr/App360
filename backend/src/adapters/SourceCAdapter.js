const BaseAdapter = require('./BaseAdapter');
const mockSourcesService = require('../services/mockSources.service');
const config = require('../config/env');

class SourceCAdapter extends BaseAdapter {
  constructor(endpointUrl = `http://127.0.0.1:${config.PORT}/api/mock/source-c`) {
    super('SOURCE_C', endpointUrl);
  }

  async fetchRawData(options = {}) {
    try {
      if (options.useDirectService) {
        return mockSourcesService.getSourceCData(options.simulateFailure);
      }

      const response = await this.client.get(this.endpointUrl, {
        params: { simulateFailure: options.simulateFailure ? 'true' : 'false' }
      });

      if (!Array.isArray(response.data)) {
        throw new Error('Source C returned non-array payload');
      }

      return response.data;
    } catch (error) {
      if (options.useDirectService || error.code === 'ECONNREFUSED') {
        return mockSourcesService.getSourceCData(options.simulateFailure);
      }
      throw new Error(`Source C fetch error: ${error.message}`);
    }
  }

  transform(rawItem) {
    if (!rawItem || typeof rawItem !== 'object') {
      throw new Error('Source C raw item must be an object');
    }

    const asset = rawItem.asset || {};

    return {
      sourceId: this.sourceId,
      externalAlarmId: rawItem.notification_id,
      siteId: asset.site_code,
      deviceId: asset.identifier,
      alarmType: rawItem.fault_type,
      severity: rawItem.severity,
      message: rawItem.message,
      timestamp: rawItem.occurred_on,
      status: 'ACTIVE',
      rawPayload: rawItem
    };
  }
}

module.exports = new SourceCAdapter();

