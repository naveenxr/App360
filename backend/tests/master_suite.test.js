const http = require('http');
const mongoose = require('mongoose');
const { io: ioClient } = require('socket.io-client');
const app = require('../src/app');
const config = require('../src/config/env');
const { initSocketServer, closeSocketServer } = require('../src/websocket/socketServer');
const { seedRoles } = require('../src/utils/seedRoles');
const { seedUsers } = require('../src/utils/seedUsers');
const { seedTopology } = require('../src/utils/seedTopology');
const { SERVER_EVENTS, CLIENT_EVENTS, ROOMS } = require('../src/constants/socketEvents');

const SourceAAdapter = require('../src/adapters/SourceAAdapter');
const SourceBAdapter = require('../src/adapters/SourceBAdapter');
const SourceCAdapter = require('../src/adapters/SourceCAdapter');
const AlarmNormalizer = require('../src/services/AlarmNormalizer');
const IngestionService = require('../src/services/IngestionService');
const correlationService = require('../src/services/correlationService');
const EventService = require('../src/services/EventService');
const AlarmRepository = require('../src/repositories/AlarmRepository');
const EventRepository = require('../src/repositories/EventRepository');
const RoleRepository = require('../src/repositories/RoleRepository');
const UserRepository = require('../src/repositories/UserRepository');

const Alarm = require('../src/models/Alarm');
const Event = require('../src/models/Event');
const Role = require('../src/models/Role');
const User = require('../src/models/User');
const RawAlarmPayload = require('../src/models/RawAlarmPayload');

const TEST_DB_URI = 'mongodb://127.0.0.1:27017/app360_master_integration_test';

let httpServer;
let port;
let baseUrl;
let socketServerUrl;

let adminToken = '';
let engineerToken = '';
let viewerToken = '';

const testResults = [];

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    testResults.push({ name: testName, status: 'PASS', details });
  } else {
    console.error(`  ❌ [FAIL] ${testName} - ${details}`);
    testResults.push({ name: testName, status: 'FAIL', details });
    throw new Error(`Assertion failed: ${testName} - ${details}`);
  }
}

const makeHttpRequest = async (path, method = 'GET', token = '', bodyData = null) => {
  return new Promise((resolve, reject) => {
    const headers = {};
    let postData = '';
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (bodyData) {
      postData = JSON.stringify(bodyData);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch (e) {
            resolve({ status: res.statusCode, data: body });
          }
        });
      }
    );
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
};

const createConnectedSocket = (token) => {
  return new Promise((resolve, reject) => {
    const client = ioClient(socketServerUrl, {
      auth: { token },
      transports: ['websocket'],
      forceNew: true,
      reconnection: false
    });

    const timeout = setTimeout(() => {
      client.disconnect();
      reject(new Error('Socket connection timed out'));
    }, 4000);

    client.on('connect', () => {
      clearTimeout(timeout);
      resolve(client);
    });

    client.on('connect_error', (err) => {
      clearTimeout(timeout);
      resolve({ error: err, client });
    });
  });
};

async function runMasterTestSuite() {
  console.log('\n================================================================================');
  console.log('🚀 APP360 MASTER INTEGRATION TEST SUITE (PHASE 7.2 → FINAL RELEASE)');
  console.log('   Full-Stack Verification: Auth, Dynamic RBAC, Ingestion, Correlation,');
  console.log('   Real-Time Socket.IO, Incident Lifecycle, & Suganthan Operator Matrix');
  console.log('================================================================================\n');

  try {
    // 0. Setup isolated test database & Socket.IO HTTP server
    console.log('📦 Setting up isolated database & server on dynamic port...');
    await mongoose.connect(TEST_DB_URI, {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000
    });
    await mongoose.connection.dropDatabase();

    httpServer = http.createServer(app);
    initSocketServer(httpServer);

    await new Promise((resolve) => {
      httpServer.listen(0, '127.0.0.1', () => {
        port = httpServer.address().port;
        baseUrl = `http://127.0.0.1:${port}/api`;
        socketServerUrl = `http://127.0.0.1:${port}`;
        console.log(`📡 Backend + Socket.IO server running at http://127.0.0.1:${port}`);
        resolve();
      });
    });

    // Seed roles and initial users
    await seedRoles();
    await seedUsers();
    await seedTopology();

    // =========================================================================
    // SCENARIO A: Authentication Engine
    // =========================================================================
    console.log('\n-------------------------------------------------------------');
    console.log('🔑 SCENARIO A: Authentication Engine Verification');
    console.log('-------------------------------------------------------------');

    // A1: Admin login
    const adminLogin = await makeHttpRequest('/api/auth/login', 'POST', '', {
      email: 'admin@app360.internal',
      password: 'Admin@360!'
    });
    assert(adminLogin.status === 200 && adminLogin.data.data?.token, 'A1: Admin login returns 200 and valid JWT token');
    adminToken = adminLogin.data.data.token;
    assert(adminLogin.data.data.user.role.name === 'ADMIN', 'A1b: Admin user payload returns role ADMIN');

    // A2: Engineer login
    const engLogin = await makeHttpRequest('/api/auth/login', 'POST', '', {
      email: 'engineer.test@app360.internal',
      password: 'Password123!'
    });
    assert(engLogin.status === 200 && engLogin.data.data?.token, 'A2: Engineer login returns 200 and valid JWT token');
    engineerToken = engLogin.data.data.token;
    assert(engLogin.data.data.user.role.name === 'ENGINEER', 'A2b: Engineer user payload returns role ENGINEER');

    // A3: Viewer login
    const viewLogin = await makeHttpRequest('/api/auth/login', 'POST', '', {
      email: 'viewer.test@app360.internal',
      password: 'Password123!'
    });
    assert(viewLogin.status === 200 && viewLogin.data.data?.token, 'A3: Viewer login returns 200 and valid JWT token');
    viewerToken = viewLogin.data.data.token;
    assert(viewLogin.data.data.user.role.name === 'VIEWER', 'A3b: Viewer user payload returns role VIEWER');

    // A4: Bad credentials rejected
    const badLogin = await makeHttpRequest('/api/auth/login', 'POST', '', {
      email: 'admin@app360.internal',
      password: 'WrongPassword999!'
    });
    assert(badLogin.status === 401, 'A4: Bad password returns 401 INVALID_CREDENTIALS');

    // A5: Missing / invalid token on protected route
    const noTokenRes = await makeHttpRequest('/api/alarms', 'GET', '');
    assert(noTokenRes.status === 401, 'A5: Request without Bearer token returns 401 Unauthorized');

    const invalidTokenRes = await makeHttpRequest('/api/alarms', 'GET', 'malformed.jwt.token');
    assert(invalidTokenRes.status === 401, 'A5b: Request with forged token returns 401 Unauthorized');

    // =========================================================================
    // SCENARIO B: Dynamic Database-Driven RBAC Engine
    // =========================================================================
    console.log('\n-------------------------------------------------------------');
    console.log('🛡️ SCENARIO B: Dynamic Database-Driven RBAC Engine');
    console.log('-------------------------------------------------------------');

    // B1: Retrieve permissions matrix
    const permMatrix = await makeHttpRequest('/api/permissions', 'GET', adminToken);
    assert(permMatrix.status === 200, 'B1: Admin can retrieve full permissions matrix');
    assert(Array.isArray(permMatrix.data.data.roles) && permMatrix.data.data.roles.length >= 3, 'B1b: Permissions matrix returns standard roles');
    assert(Array.isArray(permMatrix.data.data.modules) && permMatrix.data.data.modules.length === 9, 'B1c: Permissions matrix returns all 9 system modules');

    // B2: Create dynamic custom role
    const newRoleRes = await makeHttpRequest('/api/roles', 'POST', adminToken, {
      name: 'TIER1_SUPPORT',
      description: 'First response NOC triage tier',
      permissions: {
        dashboard: { read: true, create: false, update: false, delete: false },
        alarm: { read: true, create: false, update: true, delete: false },
        event: { read: true, create: false, update: false, delete: false },
        map: { read: true, create: false, update: false, delete: false },
        api: { read: false, create: false, update: false, delete: false },
        user: { read: false, create: false, update: false, delete: false },
        role: { read: false, create: false, update: false, delete: false },
        settings: { read: true, create: false, update: false, delete: false },
        audit: { read: false, create: false, update: false, delete: false }
      }
    });
    assert(newRoleRes.status === 201, 'B2: Admin can dynamically create custom role (TIER1_SUPPORT)');
    const createdRoleId = newRoleRes.data.data.id;

    // B3: Update dynamic role permissions
    const updateRoleRes = await makeHttpRequest(`/api/roles/${createdRoleId}`, 'PUT', adminToken, {
      description: 'First response NOC triage tier (Elevated)',
      permissions: {
        dashboard: { read: true, create: false, update: false, delete: false },
        alarm: { read: true, create: false, update: true, delete: false },
        event: { read: true, create: false, update: true, delete: false }, // granted event update
        map: { read: true, create: false, update: false, delete: false },
        api: { read: false, create: false, update: false, delete: false },
        user: { read: false, create: false, update: false, delete: false },
        role: { read: false, create: false, update: false, delete: false },
        settings: { read: true, create: false, update: false, delete: false },
        audit: { read: false, create: false, update: false, delete: false }
      }
    });
    assert(updateRoleRes.status === 200, 'B3: Dynamic role permissions updated successfully in MongoDB');
    assert(updateRoleRes.data.data.permissions.event.update === true, 'B3b: Updated event permission persisted');

    // B4: Viewer attempting to create role gets 403 Forbidden
    const viewerForbiddenRole = await makeHttpRequest('/api/roles', 'POST', viewerToken, {
      name: 'ROGUE_ROLE',
      permissions: {}
    });
    assert(viewerForbiddenRole.status === 403, 'B4: Viewer cannot create roles (403 Forbidden enforced)');

    // =========================================================================
    // SCENARIO C: Multi-Source Telemetry Ingestion Pipeline
    // =========================================================================
    console.log('\n-------------------------------------------------------------');
    console.log('📡 SCENARIO C: Multi-Source Telemetry Ingestion Pipeline');
    console.log('-------------------------------------------------------------');

    // C1: Source A (SolarWinds legacy)
    const rawA = await SourceAAdapter.fetchRawData({ useDirectService: true });
    assert(Array.isArray(rawA) && rawA.length > 0, 'C1a: Source A adapter fetches raw telemetry records');
    const transformedA = SourceAAdapter.transform(rawA[0]);
    assert(transformedA.sourceId === 'SOURCE_A' && transformedA.siteId === 'CHN001', 'C1b: Source A correctly transformed');

    // C2: Source B (OpenNMS)
    const rawB = await SourceBAdapter.fetchRawData({ useDirectService: true });
    assert(Array.isArray(rawB) && rawB.length > 0, 'C2a: Source B adapter fetches raw telemetry records');
    const transformedB = SourceBAdapter.transform(rawB[0]);
    assert(transformedB.sourceId === 'SOURCE_B' && transformedB.deviceId === 'RTR001', 'C2b: Source B correctly transformed');

    // C3: Source C (Custom Agent)
    const rawC = await SourceCAdapter.fetchRawData({ useDirectService: true });
    assert(Array.isArray(rawC) && rawC.length > 0, 'C3a: Source C adapter fetches raw telemetry records');
    const transformedC = SourceCAdapter.transform(rawC[0]);
    assert(transformedC.sourceId === 'SOURCE_C', 'C3b: Source C correctly transformed');

    // C4: Normalization to canonical schema
    const canonicalA = AlarmNormalizer.normalize(transformedA);
    const requiredKeys = ['sourceId', 'externalAlarmId', 'siteId', 'deviceId', 'alarmType', 'severity', 'message', 'timestamp', 'status', 'rawPayload'];
    assert(requiredKeys.every((k) => k in canonicalA), 'C4: AlarmNormalizer generates complete canonical alarm schema');

    // C5: Duplicate Suppression & Raw Payload Preservation
    const testAlarmPayload = {
      sourceId: 'SOURCE_A',
      externalAlarmId: 'DUP-TEST-001',
      siteId: 'CHN001',
      deviceId: 'RTR001',
      alarmType: 'LINK_DOWN',
      severity: 'CRITICAL',
      message: 'Interface GigabitEthernet0/1 Link Down',
      timestamp: new Date().toISOString(),
      status: 'ACTIVE',
      rawPayload: { wireCode: 'ERR_LINK_01', interface: 'Gig0/1' }
    };

    const firstIngest = await IngestionService.processAlarmItem(testAlarmPayload, 'BATCH-DUP-01');
    assert(firstIngest.isDuplicate === false, 'C5a: First arrival of alarm signature is stored as new record');

    const secondIngest = await IngestionService.processAlarmItem(testAlarmPayload, 'BATCH-DUP-02');
    assert(secondIngest.isDuplicate === true, 'C5b: Identical signature within deduplication window is suppressed');
    assert(secondIngest.alarm.repeatCount >= 2, 'C5c: Duplicate alarm increments occurrence repeatCount');

    // Verify raw payload endpoint
    const rawPayloadRes = await makeHttpRequest(`/api/alarms/${firstIngest.alarm._id}/raw`, 'GET', adminToken);
    assert(rawPayloadRes.status === 200, 'C5d: Preserved raw wire payload retrieved via GET /api/alarms/:id/raw');
    assert(rawPayloadRes.data.data.rawPayload.wireCode === 'ERR_LINK_01', 'C5e: Raw payload wire attributes accurately preserved');

    // =========================================================================
    // SCENARIO D: Sliding Window Alarm Correlation Engine
    // =========================================================================
    console.log('\n-------------------------------------------------------------');
    console.log('🧠 SCENARIO D: Sliding Window Alarm Correlation Engine');
    console.log('-------------------------------------------------------------');

    const now = Date.now();
    const createDbAlarm = async (siteId, deviceId, offsetMinutes, severity, alarmType, extSuffix) => {
      const alarmDate = new Date(now - offsetMinutes * 60 * 1000);
      const extId = `CORR-${extSuffix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      return await Alarm.create({
        sourceId: 'SOURCE_A',
        externalAlarmId: extId,
        siteId: siteId.toUpperCase(),
        deviceId: deviceId.toUpperCase(),
        alarmType,
        severity,
        message: `Correlated test alarm on ${deviceId}`,
        timestamp: alarmDate,
        status: 'ACTIVE',
        rawPayload: { test: true },
        repeatCount: 1,
        ingestedAt: new Date()
      });
    };

    // D1: 3 alarms on SAME site (MUM001) & SAME device (RTR002) within 5-min window (offset 1m, 2m, 3m)
    const alarmA = await createDbAlarm('MUM001', 'RTR002', 3, 'WARNING', 'TEMP_HIGH', 'D1-1');
    const alarmB = await createDbAlarm('MUM001', 'RTR002', 2, 'MAJOR', 'CPU_SPIKE', 'D1-2');
    const alarmC = await createDbAlarm('MUM001', 'RTR002', 1, 'CRITICAL', 'BGP_FLAP', 'D1-3');

    const corrResult = await correlationService.runCorrelation();
    assert(corrResult.eventsCreated >= 1, 'D1a: Correlation run successfully grouped 3 temporal/spatial alarms into incident');

    const createdEvent = await Event.findOne({ siteId: 'MUM001', deviceId: 'RTR002' });
    assert(createdEvent !== null, 'D1b: Correlated incident exists in MongoDB with matching site/device');
    assert(createdEvent.alarmIds.length === 3, 'D1c: Incident groups exactly 3 constituent member alarms');
    assert(createdEvent.severity === 'CRITICAL', 'D1d: Incident severity escalates to the highest severity (CRITICAL)');
    assert(createdEvent.correlationRule === 'SAME_SITE_DEVICE_5MIN', 'D1e: Correlation rule tag is SAME_SITE_DEVICE_5MIN');

    // D2: Spatial isolation (Different device at same site: MUM001 / SW002)
    const diffDeviceAlarm = await createDbAlarm('MUM001', 'SW002', 1, 'WARNING', 'FAN_FAIL', 'D2');
    await correlationService.runCorrelation();
    const eventDiffDevice = await Event.findOne({ siteId: 'MUM001', deviceId: 'SW002' });
    assert(eventDiffDevice !== null && eventDiffDevice._id.toString() !== createdEvent._id.toString(), 'D2: Different device at same site forms an isolated incident');

    // D3: Regional isolation (Different site: BLR001 / RTR002)
    const diffSiteAlarm = await createDbAlarm('BLR001', 'RTR002', 1, 'MAJOR', 'OPTICAL_LOSS', 'D3');
    await correlationService.runCorrelation();
    const eventDiffSite = await Event.findOne({ siteId: 'BLR001', deviceId: 'RTR002' });
    assert(eventDiffSite !== null && eventDiffSite._id.toString() !== createdEvent._id.toString(), 'D3: Different site forms an isolated incident');

    // D4: Temporal window boundary (Alarm > 5 minutes apart, e.g. 15 minutes)
    const oldAlarm = await createDbAlarm('DEL001', 'RTR003', 15, 'MINOR', 'PORT_DOWN', 'D4-OLD');
    await correlationService.runCorrelation();
    const newAlarm = await createDbAlarm('DEL001', 'RTR003', 1, 'MAJOR', 'PORT_DOWN', 'D4-NEW');
    await correlationService.runCorrelation();
    const delEvents = await Event.find({ siteId: 'DEL001', deviceId: 'RTR003' });
    assert(delEvents.length === 2, 'D4: Alarms separated by > 5 minutes are partitioned into separate incidents');

    // D5: Correlation statistics formula check
    const statsRes = await makeHttpRequest('/api/correlation/stats', 'GET', adminToken);
    assert(statsRes.status === 200, 'D5a: Correlation statistics endpoint returns 200');
    assert(typeof statsRes.data.data.noiseReductionRate === 'number', 'D5b: Noise reduction rate is computed numeric percentage');
    assert(statsRes.data.data.noiseReductionRate >= 0 && statsRes.data.data.noiseReductionRate <= 100, 'D5c: Noise reduction rate is within valid 0-100% boundary');

    // =========================================================================
    // SCENARIO E: Real-time Socket.IO Communication & Broadcasting
    // =========================================================================
    console.log('\n-------------------------------------------------------------');
    console.log('⚡ SCENARIO E: Real-time Socket.IO Communication & Broadcasting');
    console.log('-------------------------------------------------------------');

    // E1: Authenticated connection
    const socketClientA = await createConnectedSocket(adminToken);
    assert(socketClientA.connected === true, 'E1: Admin Socket.IO client connects with valid JWT auth handshake');

    // E2: Unauthenticated connection rejected
    const unauthSocketResult = await createConnectedSocket('invalid.or.missing.token');
    assert(unauthSocketResult.error !== undefined, 'E2: Socket connection without valid JWT is rejected');

    // E3: Room subscription
    let roomJoined = false;
    await new Promise((resolve) => {
      socketClientA.emit(CLIENT_EVENTS.SUBSCRIBE, ROOMS.MONITORING_ALARMS, () => {});
      socketClientA.emit(CLIENT_EVENTS.SUBSCRIBE, ROOMS.MONITORING_EVENTS, (res) => {
        if (res && res.success) roomJoined = true;
        resolve();
      });
    });
    assert(roomJoined === true, 'E3: Socket.IO client joined monitoring:events room');

    // E4: Real-time alarm:new broadcast
    const alarmBroadcastPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('alarm:new broadcast timeout')), 3000);
      socketClientA.once(SERVER_EVENTS.ALARM_NEW, (payload) => {
        clearTimeout(timer);
        resolve(payload);
      });
    });

    await IngestionService.processAlarmItem({
      sourceId: 'SOURCE_C',
      externalAlarmId: `LIVE-WS-${Date.now()}`,
      siteId: 'CHN001',
      deviceId: 'SW001',
      alarmType: 'PACKET_DROP',
      severity: 'WARNING',
      message: 'High packet loss detected on Uplink',
      timestamp: new Date().toISOString(),
      status: 'ACTIVE',
      rawPayload: { dropPercent: 12.5 }
    }, 'LIVE-BATCH-01');

    const receivedAlarmPayload = await alarmBroadcastPromise;
    assert(receivedAlarmPayload.siteId === 'CHN001' && receivedAlarmPayload.alarmType === 'PACKET_DROP', 'E4: Backend emitted alarm:new broadcast received by Socket.IO client');

    // E5: Multi-client fanout
    const socketClientB = await createConnectedSocket(engineerToken);
    await new Promise((resolve) => {
      socketClientB.emit(CLIENT_EVENTS.SUBSCRIBE, ROOMS.MONITORING_EVENTS, resolve);
    });

    let clientAReceivedIncident = false;
    let clientBReceivedIncident = false;

    socketClientA.once(SERVER_EVENTS.INCIDENT_CREATED, () => {
      clientAReceivedIncident = true;
    });
    socketClientB.once(SERVER_EVENTS.INCIDENT_CREATED, () => {
      clientBReceivedIncident = true;
    });

    // Create 2 correlated alarms to trigger incident:created
    const liveTime = new Date().toISOString();
    await IngestionService.processAlarmItem({
      sourceId: 'SOURCE_B',
      externalAlarmId: `FANOUT-A-${Date.now()}`,
      siteId: 'HYD001',
      deviceId: 'FW001',
      alarmType: 'MEM_EXHAUST',
      severity: 'MAJOR',
      message: 'Firewall memory exceeds 92%',
      timestamp: liveTime,
      status: 'ACTIVE',
      rawPayload: { mem: 92 }
    }, 'FANOUT-BATCH');

    await IngestionService.processAlarmItem({
      sourceId: 'SOURCE_B',
      externalAlarmId: `FANOUT-B-${Date.now()}`,
      siteId: 'HYD001',
      deviceId: 'FW001',
      alarmType: 'SESSION_FULL',
      severity: 'CRITICAL',
      message: 'Firewall state table saturation',
      timestamp: liveTime,
      status: 'ACTIVE',
      rawPayload: { sessions: 100000 }
    }, 'FANOUT-BATCH');

    await correlationService.runCorrelation();
    await new Promise((r) => setTimeout(r, 500));

    assert(clientAReceivedIncident && clientBReceivedIncident, 'E5: incident:created broadcast fanout received concurrently across multiple clients');

    // =========================================================================
    // SCENARIO F: Incident Lifecycle Management & Suganthan Operator Matrix Audit
    // =========================================================================
    console.log('\n-------------------------------------------------------------');
    console.log('🔄 SCENARIO F: Incident Lifecycle & Suganthan Matrix Audit');
    console.log('-------------------------------------------------------------');

    const testEvent = await Event.findOne({ siteId: 'HYD001', deviceId: 'FW001' });
    assert(testEvent !== null, 'F0: Target incident located for lifecycle verification');

    // F1: Acknowledge incident
    let updatedPayloadAck = null;
    socketClientA.once(SERVER_EVENTS.INCIDENT_UPDATED, (p) => { updatedPayloadAck = p; });

    const ackRes = await makeHttpRequest(`/api/events/${testEvent._id}/acknowledge`, 'POST', engineerToken, {
      notes: 'Investigating firewall state table overflow'
    });
    assert(ackRes.status === 200, 'F1a: Engineer can acknowledge incident (200 OK)');
    assert(ackRes.data.data.status === 'ACKNOWLEDGED', 'F1b: Incident status transitioned to ACKNOWLEDGED');
    assert(Array.isArray(ackRes.data.data.statusHistory) && ackRes.data.data.statusHistory.length >= 1, 'F1c: Acknowledge action recorded in statusHistory audit timeline');
    await new Promise((r) => setTimeout(r, 200));
    assert(updatedPayloadAck && updatedPayloadAck.status === 'ACKNOWLEDGED', 'F1d: Real-time incident:updated broadcast received for acknowledgment');

    // F2: Resolve incident
    let updatedPayloadResolve = null;
    socketClientA.once(SERVER_EVENTS.INCIDENT_UPDATED, (p) => { updatedPayloadResolve = p; });

    const resolveRes = await makeHttpRequest(`/api/events/${testEvent._id}/resolve`, 'POST', engineerToken, {
      notes: 'Cleared stale TCP sessions and increased pool limit'
    });
    assert(resolveRes.status === 200, 'F2a: Engineer can resolve incident (200 OK)');
    assert(resolveRes.data.data.status === 'RESOLVED', 'F2b: Incident status transitioned to RESOLVED');
    assert(resolveRes.data.data.statusHistory.length >= 2, 'F2c: Resolution action recorded in statusHistory timeline');
    await new Promise((r) => setTimeout(r, 200));
    assert(updatedPayloadResolve && updatedPayloadResolve.status === 'RESOLVED', 'F2d: Real-time incident:updated broadcast received for resolution');

    // Constituent alarms should now be CLEARED
    const constituentAlarmsAfterResolve = await Alarm.find({ _id: { $in: testEvent.alarmIds } });
    assert(constituentAlarmsAfterResolve.every((a) => a.status === 'CLEARED'), 'F2e: Constituent member alarms automatically cleared on incident resolution');

    // F3: Reopen incident
    let updatedPayloadReopen = null;
    socketClientA.once(SERVER_EVENTS.INCIDENT_UPDATED, (p) => { updatedPayloadReopen = p; });

    const reopenRes = await makeHttpRequest(`/api/events/${testEvent._id}/reopen`, 'POST', engineerToken, {
      notes: 'Firewall sessions spiking again; reopening for senior network architect review'
    });
    assert(reopenRes.status === 200, 'F3a: Engineer can reopen resolved incident (200 OK)');
    assert(reopenRes.data.data.status === 'OPEN', 'F3b: Incident status transitioned back to OPEN');
    assert(reopenRes.data.data.statusHistory.length >= 3, 'F3c: Reopening action recorded in statusHistory timeline');
    await new Promise((r) => setTimeout(r, 200));
    assert(updatedPayloadReopen && updatedPayloadReopen.status === 'OPEN', 'F3d: Real-time incident:updated broadcast received for reopening');

    // Constituent alarms should now be reactivated to ACTIVE
    const constituentAlarmsAfterReopen = await Alarm.find({ _id: { $in: testEvent.alarmIds } });
    assert(constituentAlarmsAfterReopen.every((a) => a.status === 'ACTIVE'), 'F3e: Constituent member alarms reactivated to ACTIVE on incident reopen');

    // F4: Constituent alarms drill-down endpoint
    const drillDownRes = await makeHttpRequest(`/api/events/${testEvent._id}/alarms`, 'GET', engineerToken);
    assert(drillDownRes.status === 200, 'F4a: Drill-down endpoint GET /api/events/:id/alarms returns 200');
    assert(Array.isArray(drillDownRes.data.data.alarms) && drillDownRes.data.data.alarms.length >= 2, 'F4b: Drill-down returns member alarm objects');
    assert(drillDownRes.data.data.correlationRule === 'SAME_SITE_DEVICE_5MIN', 'F4c: Drill-down returns correlation rule metadata');
    assert(Array.isArray(drillDownRes.data.data.statusHistory) && drillDownRes.data.data.statusHistory.length === 3, 'F4d: Drill-down returns complete 3-step statusHistory audit timeline');

    // F5: Suganthan Dynamic Operator Matrix Audit
    console.log('\n🔹 Auditing Suganthan Operator Creation & Permission Matrix Resolution...');
    const engineerRole = await Role.findOne({ name: 'ENGINEER' });
    const createSuganthanRes = await makeHttpRequest('/api/users', 'POST', adminToken, {
      name: 'Suganthan',
      email: 'suganthan@app360.internal',
      password: 'SuganthanSecure2026!',
      roleId: engineerRole._id.toString()
    });
    assert(createSuganthanRes.status === 201, 'F5a: Admin successfully creates operator Suganthan via POST /api/users');

    const matrixAuditRes = await makeHttpRequest('/api/permissions', 'GET', adminToken);
    assert(matrixAuditRes.status === 200, 'F5b: Permissions matrix endpoint returns 200');

    // Check users array in matrix response
    const matrixUsers = matrixAuditRes.data.data.users || [];
    const suganthanUser = matrixUsers.find((u) => u.email === 'suganthan@app360.internal');
    assert(suganthanUser !== undefined, 'F5c: Suganthan is returned in permissions matrix users roster');
    assert(suganthanUser.roleName === 'ENGINEER', 'F5d: Suganthan correctly linked to ENGINEER role in roster');

    // Check assignedUsers array on the ENGINEER role object
    const rolesInMatrix = matrixAuditRes.data.data.roles || [];
    const engineerRoleInMatrix = rolesInMatrix.find((r) => r.name === 'ENGINEER');
    assert(engineerRoleInMatrix !== undefined, 'F5e: ENGINEER role present in permissions matrix');
    const suganthanInRole = (engineerRoleInMatrix.assignedUsers || []).find((u) => u.email === 'suganthan@app360.internal');
    assert(suganthanInRole !== undefined, 'F5f: Suganthan is enriched directly in ENGINEER assignedUsers list in matrix');

    // Clean up sockets
    socketClientA.disconnect();
    socketClientB.disconnect();

    console.log('\n================================================================================');
    console.log(`🎉 MASTER INTEGRATION TEST SUITE COMPLETED: ALL ${testResults.length} / ${testResults.length} ASSERTIONS PASSED!`);
    console.log('================================================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('\n❌ MASTER SUITE FAILED:', err);
    process.exit(1);
  } finally {
    if (httpServer) {
      closeSocketServer();
      httpServer.close();
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

runMasterTestSuite();
