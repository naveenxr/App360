const SiteRepository = require('../repositories/SiteRepository');
const DeviceRepository = require('../repositories/DeviceRepository');
const AlarmRepository = require('../repositories/AlarmRepository');
const EventRepository = require('../repositories/EventRepository');

const SEVERITY_WEIGHTS = {
  CRITICAL: 5,
  MAJOR: 4,
  MINOR: 3,
  WARNING: 2,
  INFO: 1,
  CLEAR: 0
};

class TopologyService {
  /**
   * Retrieves all sites with dynamic severity rollup and active alarm counters.
   * @param {Object} queryFilters - { region, severity, status }
   * @returns {Promise<Array<Object>>}
   */
  async getSites(queryFilters = {}) {
    const filter = {};

    if (queryFilters.region) {
      filter.region = queryFilters.region;
    }

    if (queryFilters.status) {
      filter.status = String(queryFilters.status).toUpperCase();
    }

    if (queryFilters.severity) {
      filter.currentSeverity = String(queryFilters.severity).toUpperCase();
    }

    // Recalculate dynamic rollups before listing
    await this.syncActiveSeverities();

    return await SiteRepository.listSites(filter);
  }

  /**
   * Retrieves a single site by ID along with its hardware roster and active alarms.
   * @param {string} siteId 
   * @returns {Promise<Object>}
   */
  async getSiteById(siteId) {
    const id = String(siteId).toUpperCase().trim();
    const site = await SiteRepository.findBySiteId(id);

    if (!site) {
      const error = new Error(`Site with ID [${id}] not found`);
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    const [devices, activeAlarms, activeEvents] = await Promise.all([
      DeviceRepository.findBySite(id),
      AlarmRepository.findAll({ siteId: id, status: 'ACTIVE' }),
      EventRepository.findAll({ siteId: id, status: { $in: ['OPEN', 'ACKNOWLEDGED'] } })
    ]);

    return {
      site,
      devices,
      activeAlarmCount: activeAlarms.length,
      activeAlarms,
      activeEvents
    };
  }

  /**
   * Lists devices/nodes with optional filtering.
   * @param {Object} queryFilters - { siteId, type, status, severity }
   * @returns {Promise<Array<Object>>}
   */
  async getNodes(queryFilters = {}) {
    const filter = {};

    if (queryFilters.siteId) {
      filter.siteId = String(queryFilters.siteId).toUpperCase().trim();
    }

    if (queryFilters.type) {
      filter.type = String(queryFilters.type).toUpperCase().trim();
    }

    if (queryFilters.status) {
      filter.status = String(queryFilters.status).toUpperCase().trim();
    }

    if (queryFilters.severity) {
      filter.currentSeverity = String(queryFilters.severity).toUpperCase().trim();
    }

    return await DeviceRepository.listDevices(filter);
  }

  /**
   * Dynamic node marker drill-down called when a user clicks a node marker on the Leaflet map.
   * Directly fetches real-time active alarms and linked correlated incident without relying on stale cache.
   * 
   * @param {string} deviceId 
   * @returns {Promise<Object>}
   */
  async getNodeLiveAlarms(deviceId) {
    const id = String(deviceId).toUpperCase().trim();
    const node = await DeviceRepository.findByDeviceId(id);

    if (!node) {
      const error = new Error(`Device node with ID [${id}] not found`);
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    const [activeAlarms, activeEvents] = await Promise.all([
      AlarmRepository.findAll({ deviceId: id, status: 'ACTIVE' }, null, { sort: { timestamp: -1 } }),
      EventRepository.findAll({ deviceId: id, status: { $in: ['OPEN', 'ACKNOWLEDGED'] } }, null, {
        sort: { lastOccurredAt: -1 }
      })
    ]);

    const linkedCorrelatedEvent = activeEvents.length > 0 ? activeEvents[0] : null;

    return {
      node,
      activeAlarmCount: activeAlarms.length,
      activeAlarms,
      linkedCorrelatedEvent
    };
  }

  /**
   * Retrieves high-level network topology summary metrics.
   * @returns {Promise<Object>}
   */
  async getTopologySummary() {
    const [totalSites, totalDevices, activeAlarms, openEvents, sites] = await Promise.all([
      SiteRepository.count({}),
      DeviceRepository.count({}),
      AlarmRepository.count({ status: 'ACTIVE' }),
      EventRepository.count({ status: { $in: ['OPEN', 'ACKNOWLEDGED'] } }),
      SiteRepository.findAll({})
    ]);

    const severityBreakdown = {
      CRITICAL: 0,
      MAJOR: 0,
      MINOR: 0,
      WARNING: 0,
      CLEAR: 0
    };

    sites.forEach((site) => {
      const sev = site.currentSeverity || 'CLEAR';
      if (severityBreakdown.hasOwnProperty(sev)) {
        severityBreakdown[sev] += 1;
      }
    });

    return {
      totalSites,
      totalDevices,
      activeAlarms,
      openCorrelatedEvents: openEvents,
      severityBreakdown
    };
  }

  /**
   * Synchronizes active alarm severities to both devices and their parent sites.
   */
  async syncActiveSeverities() {
    const activeAlarms = await AlarmRepository.findAll({ status: 'ACTIVE' });

    // 1. Group active alarms by deviceId and siteId
    const deviceAlarmsMap = new Map();
    const siteAlarmsMap = new Map();

    for (const alarm of activeAlarms) {
      const devId = alarm.deviceId.toUpperCase();
      const siteId = alarm.siteId.toUpperCase();

      if (!deviceAlarmsMap.has(devId)) deviceAlarmsMap.set(devId, []);
      deviceAlarmsMap.get(devId).push(alarm.severity);

      if (!siteAlarmsMap.has(siteId)) siteAlarmsMap.set(siteId, []);
      siteAlarmsMap.get(siteId).push(alarm.severity);
    }

    // 2. Update device severities
    const allDevices = await DeviceRepository.findAll({});
    for (const dev of allDevices) {
      const devId = dev.deviceId.toUpperCase();
      const alarmSeverities = deviceAlarmsMap.get(devId) || [];
      const newSeverity = this.calculateHighestSeverity(alarmSeverities);
      const newStatus = newSeverity === 'CRITICAL' ? 'DEGRADED' : dev.status;

      if (dev.currentSeverity !== newSeverity) {
        dev.currentSeverity = newSeverity;
        dev.status = newStatus;
        await dev.save();
      }
    }

    // 3. Update site severities & active alarm counters
    const allSites = await SiteRepository.findAll({});
    for (const site of allSites) {
      const sId = site.siteId.toUpperCase();
      const alarmSeverities = siteAlarmsMap.get(sId) || [];
      const newSeverity = this.calculateHighestSeverity(alarmSeverities);
      const activeCount = alarmSeverities.length;

      if (site.currentSeverity !== newSeverity || site.activeAlarmCount !== activeCount) {
        site.currentSeverity = newSeverity;
        site.activeAlarmCount = activeCount;
        await site.save();
      }
    }
  }

  calculateHighestSeverity(severities = []) {
    if (!severities || severities.length === 0) return 'CLEAR';

    let maxWeight = 0;
    let highest = 'CLEAR';

    for (const s of severities) {
      const normalized = String(s).toUpperCase();
      const weight = SEVERITY_WEIGHTS[normalized] || 0;
      if (weight > maxWeight) {
        maxWeight = weight;
        highest = normalized;
      }
    }

    return highest;
  }
}

module.exports = new TopologyService();

