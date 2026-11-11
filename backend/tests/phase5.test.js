const mongoose = require('mongoose');
const app = require('../src/app');
const Role = require('../src/models/Role');
const User = require('../src/models/User');
const Site = require('../src/models/Site');
const Device = require('../src/models/Device');
const Alarm = require('../src/models/Alarm');
const Event = require('../src/models/Event');
const RawAlarmPayload = require('../src/models/RawAlarmPayload');
const { seedRoles } = require('../src/utils/seedRoles');
const bootstrapAdmin = require('../src/utils/bootstrapAdmin');
const { seedTopology } = require('../src/utils/seedTopology');
const correlationService = require('../src/services/correlationService');

const TEST_DB_URI = 'mongodb://127.0.0.1:27017/app360_phase5_test';

let server;
let baseUrl;
let adminToken = '';
let engineerToken = '';
let viewerToken = '';

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    console.error(`  ❌ [FAIL] ${testName} - ${details}`);
    throw new Error(`Assertion failed: ${testName} - ${details}`);
  }
}

async function createMockAlarm(siteId, deviceId, timestampStr, severity = 'WARNING', alarmType = 'HIGH_CPU') {
  const extId = `TEST-ALM-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const rawDoc = await RawAlarmPayload.create({
    sourceId: 'SOURCE_TEST',
    externalAlarmId: extId,
    ingestionBatchId: 'TEST-BATCH',
    rawPayload: { mock: true },
    checksum: 'mock-checksum-' + extId,
    ingestedAt: new Date()
  });

  return await Alarm.create({
    sourceId: 'SOURCE_TEST',
    externalAlarmId: extId,
    siteId: siteId.toUpperCase(),
    deviceId: deviceId.toUpperCase(),
    alarmType,
    severity,
    message: `Test alarm on ${deviceId}`,
    timestamp: new Date(timestampStr),
    status: 'ACTIVE',
    rawPayload: { mock: true },
    rawPayloadId: rawDoc._id,
    repeatCount: 1,
    ingestedAt: new Date()
  });
}

async function runPhase5Tests() {
  console.log('\n=============================================================');
  console.log('🧪 Starting App360 Phase 5 Test Suite (Network Topology & Sites)');
  console.log('=============================================================\n');

  try {
    // 1. Setup isolated database & server
    await mongoose.connect(TEST_DB_URI, {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000
    });
    await mongoose.connection.dropDatabase();

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}/api`;
        resolve();
      });
    });

    // 2. Seed roles & admin
    await seedRoles();
    process.env.ADMIN_EMAIL = 'admin@app360.internal';
    process.env.ADMIN_PASSWORD = 'AdminSecurePassword2026!';
    await bootstrapAdmin();

    // 3. Login as Admin
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@app360.internal',
        password: 'AdminSecurePassword2026!'
      })
    });
    const loginData = await loginRes.json();
    adminToken = loginData.data.token;

    // 4. Create Engineer and Viewer users
    const engineerRole = await Role.findOne({ name: 'ENGINEER' });
    const viewerRole = await Role.findOne({ name: 'VIEWER' });

    await fetch(`${baseUrl}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Engineer User',
        email: 'engineer@app360.internal',
        password: 'Password123!',
        roleId: engineerRole._id.toString()
      })
    });

    await fetch(`${baseUrl}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Viewer User',
        email: 'viewer@app360.internal',
        password: 'Password123!',
        roleId: viewerRole._id.toString()
      })
    });

    const engLogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'engineer@app360.internal', password: 'Password123!' })
    });
    engineerToken = (await engLogin.json()).data.token;

    const viewLogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'viewer@app360.internal', password: 'Password123!' })
    });
    viewerToken = (await viewLogin.json()).data.token;

    // -------------------------------------------------------------
    // Test 1: Seed Topology Idempotency
    // -------------------------------------------------------------
    console.log('🔹 Test 1: Seed Topology Data...');
    await seedTopology();
    await seedTopology(); // Run twice to verify idempotency

    const siteCount = await Site.countDocuments({});
    const deviceCount = await Device.countDocuments({});
    assert(siteCount === 7, 'Test 1a: Seeded exactly 7 Indian telecom sites');
    assert(deviceCount === 12, 'Test 1b: Seeded exactly 12 hardware devices');

    // -------------------------------------------------------------
    // Test 2: GET /api/topology/sites
    // -------------------------------------------------------------
    console.log('\n🔹 Test 2: GET /api/topology/sites (Listing & Geo-Coordinates)...');
    const sitesRes = await fetch(`${baseUrl}/topology/sites`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const sitesData = await sitesRes.json();

    assert(sitesRes.status === 200, 'Test 2a: Sites endpoint returns HTTP 200 OK');
    assert(Array.isArray(sitesData.data) && sitesData.data.length === 7, 'Test 2b: Returns all 7 sites');

    const chnSite = sitesData.data.find((s) => s.siteId === 'CHN001');
    assert(
      chnSite &&
      chnSite.coordinates.latitude === 13.0827 &&
      chnSite.coordinates.longitude === 80.2707,
      'Test 2c: Site contains accurate geographical coordinates for Leaflet map'
    );

    // -------------------------------------------------------------
    // Test 3: Region Filtering
    // -------------------------------------------------------------
    console.log('\n🔹 Test 3: Region Filtering...');
    const southRes = await fetch(`${baseUrl}/topology/sites?region=South`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const southData = await southRes.json();

    assert(
      southRes.status === 200 &&
      southData.data.every((s) => s.region === 'South'),
      'Test 3: Query parameter ?region=South strictly returns only southern hub facilities'
    );

    // -------------------------------------------------------------
    // Test 4: GET /api/topology/sites/:id (Site Details & Hardware Inventory)
    // -------------------------------------------------------------
    console.log('\n🔹 Test 4: GET /api/topology/sites/:id...');
    const siteDetailRes = await fetch(`${baseUrl}/topology/sites/CHN001`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const siteDetailData = await siteDetailRes.json();

    assert(siteDetailRes.status === 200, 'Test 4a: Returns HTTP 200 for valid site ID');
    assert(
      siteDetailData.data.devices.length === 2 &&
      siteDetailData.data.devices.some((d) => d.deviceId === 'RTR001') &&
      siteDetailData.data.devices.some((d) => d.deviceId === 'RTR002'),
      'Test 4b: Returns devices roster belonging to the specified site'
    );

    const invalidSiteRes = await fetch(`${baseUrl}/topology/sites/INVALID999`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(invalidSiteRes.status === 404, 'Test 4c: Returns HTTP 404 NOT_FOUND for non-existent site ID');

    // -------------------------------------------------------------
    // Test 5: GET /api/topology/nodes (List & Filter Devices)
    // -------------------------------------------------------------
    console.log('\n🔹 Test 5: GET /api/topology/nodes...');
    const nodesRes = await fetch(`${baseUrl}/topology/nodes?siteId=MUM001`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const nodesData = await nodesRes.json();

    assert(nodesRes.status === 200, 'Test 5a: Nodes endpoint returns HTTP 200 OK');
    assert(
      nodesData.data.length === 2 &&
      nodesData.data.every((n) => n.siteId === 'MUM001'),
      'Test 5b: ?siteId=MUM001 strictly returns devices at Mumbai West Gateway'
    );

    const typeRes = await fetch(`${baseUrl}/topology/nodes?type=FIREWALL`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const typeData = await typeRes.json();
    assert(
      typeData.data.every((n) => n.type === 'FIREWALL'),
      'Test 5c: ?type=FIREWALL filters hardware by equipment category'
    );

    // -------------------------------------------------------------
    // Test 6: Dynamic Node Marker Selection (GET /api/topology/nodes/:id/alarms)
    // -------------------------------------------------------------
    console.log('\n🔹 Test 6: Dynamic Node Marker Selection (Live Alarms & Event Drill-Down)...');
    // Initially unalarmed node
    const cleanNodeRes = await fetch(`${baseUrl}/topology/nodes/RTR001/alarms`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const cleanNodeData = await cleanNodeRes.json();

    assert(cleanNodeRes.status === 200, 'Test 6a: Node marker query returns HTTP 200');
    assert(
      cleanNodeData.data.activeAlarmCount === 0 &&
      cleanNodeData.data.linkedCorrelatedEvent === null,
      'Test 6b: Clean node returns 0 active alarms and null linked correlated event'
    );

    // Create 2 active alarms on RTR001 and correlate them
    const almA = await createMockAlarm('CHN001', 'RTR001', '2026-11-11T10:00:00Z', 'WARNING');
    const almB = await createMockAlarm('CHN001', 'RTR001', '2026-11-11T10:02:00Z', 'CRITICAL');
    await correlationService.correlateAlarm(almA);
    await correlationService.correlateAlarm(almB);

    // Re-query dynamically (marker click simulation)
    const activeNodeRes = await fetch(`${baseUrl}/topology/nodes/RTR001/alarms`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const activeNodeData = await activeNodeRes.json();

    assert(
      activeNodeData.data.activeAlarmCount === 2 &&
      activeNodeData.data.activeAlarms.length === 2,
      'Test 6c: Dynamic marker click returns live active alarms for RTR001'
    );
    assert(
      activeNodeData.data.linkedCorrelatedEvent !== null &&
      activeNodeData.data.linkedCorrelatedEvent.severity === 'CRITICAL',
      'Test 6d: Dynamic marker click returns linked active correlated incident with escalated severity'
    );

    // -------------------------------------------------------------
    // Test 7: Dynamic Topology Severity Rollup
    // -------------------------------------------------------------
    console.log('\n🔹 Test 7: Dynamic Topology Severity Rollup...');
    const rolledUpSitesRes = await fetch(`${baseUrl}/topology/sites`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const rolledUpSitesData = await rolledUpSitesRes.json();

    const chnRolledUp = rolledUpSitesData.data.find((s) => s.siteId === 'CHN001');
    assert(
      chnRolledUp.currentSeverity === 'CRITICAL' && chnRolledUp.activeAlarmCount === 2,
      'Test 7a: Parent site CHN001 dynamically rolled up to CRITICAL with 2 active alarms'
    );

    // Filter by severity=CRITICAL
    const critSitesRes = await fetch(`${baseUrl}/topology/sites?severity=CRITICAL`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const critSitesData = await critSitesRes.json();
    assert(
      critSitesData.data.length === 1 && critSitesData.data[0].siteId === 'CHN001',
      'Test 7b: ?severity=CRITICAL strictly returns only the affected site'
    );

    // -------------------------------------------------------------
    // Test 8: Network Topology Summary Metrics
    // -------------------------------------------------------------
    console.log('\n🔹 Test 8: GET /api/topology/summary...');
    const summaryRes = await fetch(`${baseUrl}/topology/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const summaryData = await summaryRes.json();

    assert(summaryRes.status === 200, 'Test 8a: Summary endpoint returns HTTP 200');
    assert(
      summaryData.data.totalSites === 7 &&
      summaryData.data.totalDevices === 12 &&
      summaryData.data.activeAlarms === 2 &&
      summaryData.data.openCorrelatedEvents === 1 &&
      summaryData.data.severityBreakdown.CRITICAL === 1,
      'Test 8b: Summary returns aggregate topology KPIs across sites, devices, and severities'
    );

    // -------------------------------------------------------------
    // Test 9: RBAC Authorization (Engineer & Viewer Access)
    // -------------------------------------------------------------
    console.log('\n🔹 Test 9: RBAC Authorization...');
    const engSitesRes = await fetch(`${baseUrl}/topology/sites`, {
      headers: { Authorization: `Bearer ${engineerToken}` }
    });
    assert(engSitesRes.status === 200, 'Test 9a: Engineer with map:read permission can access topology');

    const viewSitesRes = await fetch(`${baseUrl}/topology/sites`, {
      headers: { Authorization: `Bearer ${viewerToken}` }
    });
    assert(viewSitesRes.status === 200, 'Test 9b: Viewer with map:read permission can access topology');

    // -------------------------------------------------------------
    // Test 10: Unauthenticated Request Rejection
    // -------------------------------------------------------------
    console.log('\n🔹 Test 10: Unauthenticated Request Rejection...');
    const unauthRes = await fetch(`${baseUrl}/topology/sites`);
    assert(unauthRes.status === 401, 'Test 10: Request without JWT token rejected with HTTP 401 UNAUTHORIZED');

    console.log('\n=============================================================');
    console.log('🎉 ALL 10 PHASE 5 TESTS PASSED PERFECTLY!');
    console.log('=============================================================\n');
  } catch (err) {
    console.error('\n💥 TEST EXECUTION FAILED:', err.message);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
    }
  }
}

runPhase5Tests();

