const axios = require('axios');

class BaseAdapter {
  constructor(sourceId, endpointUrl) {
    this.sourceId = sourceId;
    this.endpointUrl = endpointUrl;
    this.client = axios.create({
      timeout: 5000,
      headers: { 'Accept': 'application/json' }
    });
  }

  /**
   * Fetches raw items from the source endpoint
   * @param {Object} options 
   * @returns {Promise<Array>} List of raw items
   */
  async fetchRawData(options = {}) {
    throw new Error('fetchRawData must be implemented by concrete adapter');
  }

  /**
   * Transforms source-specific JSON into canonical candidate
   * @param {Object} rawItem 
   * @returns {Object} Candidate object for AlarmNormalizer
   */
  transform(rawItem) {
    throw new Error('transform must be implemented by concrete adapter');
  }
}

module.exports = BaseAdapter;
