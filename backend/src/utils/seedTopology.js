const Site = require('../models/Site');
const Device = require('../models/Device');

const SITES_DATA = [
  {
    siteId: 'CHN001',
    name: 'Chennai Central Exchange',
    region: 'South',
    coordinates: { latitude: 13.0827, longitude: 80.2707 },
    address: 'Anna Salai, Chennai, Tamil Nadu',
    status: 'ACTIVE',
    currentSeverity: 'CLEAR',
    activeAlarmCount: 0
  },
  {
    siteId: 'MUM001',
    name: 'Mumbai West Gateway',
    region: 'West',
    coordinates: { latitude: 19.0760, longitude: 72.8777 },
    address: 'Bandra Kurla Complex, Mumbai, Maharashtra',
    status: 'ACTIVE',
    currentSeverity: 'CLEAR',
    activeAlarmCount: 0
  },
  {
    siteId: 'DEL001',
    name: 'Delhi Northern Hub',
    region: 'North',
    coordinates: { latitude: 28.6139, longitude: 77.2090 },
    address: 'Barakhamba Road, New Delhi, Delhi',
    status: 'ACTIVE',
    currentSeverity: 'CLEAR',
    activeAlarmCount: 0
  },
  {
    siteId: 'BLR001',
    name: 'Bangalore Technology Hub',
    region: 'South',
    coordinates: { latitude: 12.9716, longitude: 77.5946 },
    address: 'Electronic City Phase 1, Bengaluru, Karnataka',
    status: 'ACTIVE',
    currentSeverity: 'CLEAR',
    activeAlarmCount: 0
  },
  {
    siteId: 'HYD001',
    name: 'Hyderabad Cyber Data Center',
    region: 'South',
    coordinates: { latitude: 17.3850, longitude: 78.4867 },
    address: 'HITEC City, Madhapur, Hyderabad, Telangana',
    status: 'ACTIVE',
    currentSeverity: 'CLEAR',
    activeAlarmCount: 0
  },
  {
    siteId: 'PUN001',
    name: 'Pune Operational NOC',
    region: 'West',
    coordinates: { latitude: 18.5204, longitude: 73.8567 },
    address: 'Hinjawadi Phase 2, Pune, Maharashtra',
    status: 'ACTIVE',
    currentSeverity: 'CLEAR',
    activeAlarmCount: 0
  },
  {
    siteId: 'TRY001',
    name: 'Trichy Regional Node',
    region: 'South',
    coordinates: { latitude: 10.7905, longitude: 78.7047 },
    address: 'Thillai Nagar, Tiruchirappalli, Tamil Nadu',
    status: 'ACTIVE',
    currentSeverity: 'CLEAR',
    activeAlarmCount: 0
  }
];

const DEVICES_DATA = [
  // CHN001 Devices
  {
    deviceId: 'RTR001',
    siteId: 'CHN001',
    name: 'Chennai Core Router 1',
    type: 'ROUTER',
    ipAddress: '10.10.1.1',
    status: 'ONLINE',
    currentSeverity: 'CLEAR'
  },
  {
    deviceId: 'RTR002',
    siteId: 'CHN001',
    name: 'Chennai Aggregation Router 2',
    type: 'ROUTER',
    ipAddress: '10.10.1.2',
    status: 'ONLINE',
    currentSeverity: 'CLEAR'
  },

  // MUM001 Devices
  {
    deviceId: 'FW001',
    siteId: 'MUM001',
    name: 'Mumbai Perimeter Firewall 1',
    type: 'FIREWALL',
    ipAddress: '10.20.1.1',
    status: 'ONLINE',
    currentSeverity: 'CLEAR'
  },
  {
    deviceId: 'SW002',
    siteId: 'MUM001',
    name: 'Mumbai Core Switch 2',
    type: 'SWITCH',
    ipAddress: '10.20.1.2',
    status: 'ONLINE',
    currentSeverity: 'CLEAR'
  },

  // DEL001 Devices
  {
    deviceId: 'SW001',
    siteId: 'DEL001',
    name: 'Delhi Distribution Switch 1',
    type: 'SWITCH',
    ipAddress: '10.30.1.1',
    status: 'ONLINE',
    currentSeverity: 'CLEAR'
  },
  {
    deviceId: 'RTR003',
    siteId: 'DEL001',
    name: 'Delhi Gateway Router 3',
    type: 'ROUTER',
    ipAddress: '10.30.1.2',
    status: 'ONLINE',
    currentSeverity: 'CLEAR'
  },

  // BLR001 Devices
  {
    deviceId: 'RTR010',
    siteId: 'BLR001',
    name: 'Bangalore Backbone Router 10',
    type: 'ROUTER',
    ipAddress: '10.40.1.1',
    status: 'ONLINE',
    currentSeverity: 'CLEAR'
  },
  {
    deviceId: 'BS001',
    siteId: 'BLR001',
    name: 'Bangalore 5G Base Station 1',
    type: 'BASE_STATION',
    ipAddress: '10.40.1.2',
    status: 'ONLINE',
    currentSeverity: 'CLEAR'
  },

  // HYD001 Devices
  {
    deviceId: 'SW005',
    siteId: 'HYD001',
    name: 'Hyderabad Spine Switch 5',
    type: 'SWITCH',
    ipAddress: '10.50.1.1',
    status: 'ONLINE',
    currentSeverity: 'CLEAR'
  },
  {
    deviceId: 'RTR005',
    siteId: 'HYD001',
    name: 'Hyderabad Gateway Router 5',
    type: 'ROUTER',
    ipAddress: '10.50.1.2',
    status: 'ONLINE',
    currentSeverity: 'CLEAR'
  },

  // PUN001 Devices
  {
    deviceId: 'RTR099',
    siteId: 'PUN001',
    name: 'Pune Core Router 99',
    type: 'ROUTER',
    ipAddress: '10.60.1.1',
    status: 'ONLINE',
    currentSeverity: 'CLEAR'
  },
  {
    deviceId: 'SW003',
    siteId: 'PUN001',
    name: 'Pune Edge Switch 3',
    type: 'SWITCH',
    ipAddress: '10.60.1.2',
    status: 'ONLINE',
    currentSeverity: 'CLEAR'
  }
];

/**
 * Idempotently seeds predefined network sites and hardware devices.
 */
async function seedTopology() {
  for (const s of SITES_DATA) {
    await Site.findOneAndUpdate({ siteId: s.siteId }, { $set: s }, { upsert: true, new: true });
  }

  for (const d of DEVICES_DATA) {
    await Device.findOneAndUpdate({ deviceId: d.deviceId }, { $set: d }, { upsert: true, new: true });
  }

  console.log(`🌐 Seeded ${SITES_DATA.length} sites and ${DEVICES_DATA.length} hardware devices`);
}

module.exports = {
  seedTopology,
  SITES_DATA,
  DEVICES_DATA
};
