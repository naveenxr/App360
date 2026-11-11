const crypto = require('crypto');

const VALID_SEVERITIES = ['CRITICAL', 'MAJOR', 'MINOR', 'WARNING', 'INFO'];

class AlarmNormalizer {
  /**
   * Maps heterogeneous vendor severity values into standardized canonical enum.
   * Rejects unknown severity values rather than silently defaulting.
   * 
   * @param {string|number} rawSeverity 
   * @returns {string} Standardized severity
   */
  mapSeverity(rawSeverity) {
    if (rawSeverity === undefined || rawSeverity === null || rawSeverity === '') {
      throw new Error('Severity value is missing');
    }

    const normalized = String(rawSeverity).trim().toUpperCase();

    switch (normalized) {
      case 'CRITICAL':
      case 'P1':
      case 'FATAL':
      case '100':
        return 'CRITICAL';
      case 'MAJOR':
      case 'P2':
      case 'HIGH':
      case '200':
        return 'MAJOR';
      case 'MINOR':
      case 'P3':
      case 'MED':
      case 'MEDIUM':
      case '300':
        return 'MINOR';
      case 'WARNING':
      case 'WARN':
      case 'P4':
      case 'LOW':
      case '400':
        return 'WARNING';
      case 'INFO':
      case 'INFORMATIONAL':
      case 'P5':
      case '500':
        return 'INFO';
      default:
        throw new Error(`Unknown severity value: '${rawSeverity}'. Cannot be mapped to standard severity.`);
    }
  }

  /**
   * Parses and validates timestamp into a standard UTC Date object.
   * Rejects invalid dates.
   * 
   * @param {string|number|Date} rawTime 
   * @returns {Date} Valid UTC Date
   */
  normalizeTimestamp(rawTime) {
    if (!rawTime) {
      throw new Error('Timestamp is missing');
    }

    let date;
    if (typeof rawTime === 'number') {
      // Millisecond vs Second epoch detection
      date = new Date(rawTime < 1e11 ? rawTime * 1000 : rawTime);
    } else {
      date = new Date(rawTime);
    }

    if (isNaN(date.getTime())) {
      throw new Error(`Invalid timestamp format: '${rawTime}'`);
    }

    return date;
  }

  /**
   * Computes SHA-256 checksum of raw payload for audit integrity & deduplication
   * @param {Object} rawPayload 
   * @returns {string} SHA-256 hex string
   */
  calculateChecksum(rawPayload) {
    const serialized = JSON.stringify(rawPayload, Object.keys(rawPayload || {}).sort());
    return crypto.createHash('sha256').update(serialized).digest('hex');
  }

  /**
   * Validates and transforms a normalized candidate object into canonical format.
   * Performs strict validation on all required attributes.
   * 
   * @param {Object} candidate 
   * @returns {Object} Validated canonical alarm
   */
  normalize(candidate) {
    const errors = [];

    if (!candidate.sourceId) errors.push('sourceId is required');
    if (!candidate.externalAlarmId) errors.push('externalAlarmId is required');
    if (!candidate.siteId || typeof candidate.siteId !== 'string' || !candidate.siteId.trim()) {
      errors.push('siteId is required and must be a valid non-empty string');
    }
    if (!candidate.deviceId || typeof candidate.deviceId !== 'string' || !candidate.deviceId.trim()) {
      errors.push('deviceId is required and must be a valid non-empty string');
    }
    if (!candidate.alarmType || typeof candidate.alarmType !== 'string' || !candidate.alarmType.trim()) {
      errors.push('alarmType is required');
    }
    if (!candidate.message || typeof candidate.message !== 'string' || !candidate.message.trim()) {
      errors.push('message is required');
    }

    let mappedSeverity;
    try {
      mappedSeverity = this.mapSeverity(candidate.severity);
    } catch (err) {
      errors.push(err.message);
    }

    let normalizedTimestamp;
    try {
      normalizedTimestamp = this.normalizeTimestamp(candidate.timestamp);
    } catch (err) {
      errors.push(err.message);
    }

    if (errors.length > 0) {
      const error = new Error(`Alarm normalization validation failed: ${errors.join(', ')}`);
      error.validationErrors = errors;
      error.rawPayload = candidate.rawPayload;
      throw error;
    }

    return {
      sourceId: String(candidate.sourceId).trim(),
      externalAlarmId: String(candidate.externalAlarmId).trim(),
      siteId: String(candidate.siteId).trim().toUpperCase(),
      deviceId: String(candidate.deviceId).trim().toUpperCase(),
      alarmType: String(candidate.alarmType).trim().toUpperCase(),
      severity: mappedSeverity,
      message: String(candidate.message).trim(),
      timestamp: normalizedTimestamp,
      status: candidate.status || 'ACTIVE',
      rawPayload: candidate.rawPayload || {}
    };
  }
}

module.exports = new AlarmNormalizer();

