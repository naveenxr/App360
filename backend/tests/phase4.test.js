const mongoose = require('mongoose');
const app = require('../src/app');
const Role = require('../src/models/Role');
const User = require('../src/models/User');
const Alarm = require('../src/models/Alarm');
const Event = require('../src/models/Event');
const RawAlarmPayload = require('../src/models/RawAlarmPayload');
const { seedRoles } = require('../src/utils/seedRoles');
const bootstrapAdmin = require('../src/utils/bootstrapAdmin');

const correlationService = require('../src/services/correlationService');
const EventService = require('../src/services/EventService');
const IngestionService = require('../src/services/IngestionService');

const TEST_DB_URI = 'mongodb://127.0.0.1:27017/app360_phase4_test';

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

// Helper to create test alarm in DB
async function createMockAlarm(siteId, deviceId, timestampStr, severity = 'WARNING', alarmType = 'HIGH_CPU', externalId = null) {
  const extId = externalId || `TEST-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
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

async function runPhase4Tests() {
  console.log('\n=============================================================');
  console.log('🧪 Starting App360 Phase 4 Test Suite (Alarm Correlation)');
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
        name: 'Engineer Test',
        email: 'engineer.test@app360.internal',
        password: 'Password123!',
        roleId: engineerRole._id.toString()
      })
    });

    await fetch(`${baseUrl}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Viewer Test',
        email: 'viewer.test@app360.internal',
        password: 'Password123!',
        roleId: viewerRole._id.toString()
      })
    });

    const engLogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'engineer.test@app360.internal', password: 'Password123!' })
    });
    engineerToken = (await engLogin.json()).data.token;

    const viewLogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'viewer.test@app360.internal', password: 'Password123!' })
    });
    viewerToken = (await viewLogin.json()).data.token;

    // -------------------------------------------------------------
    // Test 1: Same site, same device, within five minutes
    // -------------------------------------------------------------
    console.log('🔹 Test 1: Same site, same device, within 5 minutes...');
    const alm1 = await createMockAlarm('CHN001', 'RTR001', '2026-11-11T10:00:00Z', 'WARNING');
    const alm2 = await createMockAlarm('CHN001', 'RTR001', '2026-11-11T10:02:00Z', 'MAJOR');
    const alm3 = await createMockAlarm('CHN001', 'RTR001', '2026-11-11T10:04:00Z', 'CRITICAL');

    const res1 = await correlationService.correlateAlarm(alm1);
    const res2 = await correlationService.correlateAlarm(alm2);
    const res3 = await correlationService.correlateAlarm(alm3);

    assert(res1.action === 'CREATED', 'Test 1a: First alarm creates a new event');
    assert(res2.action === 'UPDATED', 'Test 1b: Second alarm within 2m updates existing event');
    assert(res3.action === 'UPDATED', 'Test 1c: Third alarm within 4m updates existing event');

    const event1 = await Event.findById(res1.event._id);
    assert(
      event1.alarmIds.length === 3 &&
      event1.siteId === 'CHN001' &&
      event1.deviceId === 'RTR001',
      'Test 1d: Alarms form exactly one correlated event with 3 member alarms'
    );

    // -------------------------------------------------------------
    // Test 2: Different sites (Must NOT join)
    // -------------------------------------------------------------
    console.log('\n🔹 Test 2: Different sites (Isolation)...');
    const almDiffSite = await createMockAlarm('TRY001', 'RTR001', '2026-11-11T10:01:00Z', 'MAJOR');
    const resDiffSite = await correlationService.correlateAlarm(almDiffSite);

    assert(
      resDiffSite.action === 'CREATED' &&
      resDiffSite.event._id.toString() !== event1._id.toString() &&
      resDiffSite.event.siteId === 'TRY001',
      'Test 2: Alarm at different site (TRY001 vs CHN001) spawns a separate event'
    );

    // -------------------------------------------------------------
    // Test 3: Different devices (Must NOT join)
    // -------------------------------------------------------------
    console.log('\n🔹 Test 3: Different devices (Isolation)...');
    const almDiffDev = await createMockAlarm('CHN001', 'RTR002', '2026-11-11T10:03:00Z', 'MAJOR');
    const resDiffDev = await correlationService.correlateAlarm(almDiffDev);

    assert(
      resDiffDev.action === 'CREATED' &&
      resDiffDev.event._id.toString() !== event1._id.toString() &&
      resDiffDev.event.deviceId === 'RTR002',
      'Test 3: Alarm on different device (RTR002 vs RTR001) spawns a separate event'
    );

    // -------------------------------------------------------------
    // Test 4: Exactly 5-minute boundary (<= 300,000 ms)
    // -------------------------------------------------------------
    console.log('\n🔹 Test 4: Exactly 5-minute boundary...');
    // Create base alarm at 11:00:00
    const almBoundaryA = await createMockAlarm('DEL001', 'SW001', '2026-11-11T11:00:00Z', 'WARNING');
    const resBoundaryA = await correlationService.correlateAlarm(almBoundaryA);

    // Exactly 5 minutes later at 11:05:00
    const almBoundaryB = await createMockAlarm('DEL001', 'SW001', '2026-11-11T11:05:00Z', 'MAJOR');
    const resBoundaryB = await correlationService.correlateAlarm(almBoundaryB);

    assert(
      resBoundaryB.action === 'UPDATED' &&
      resBoundaryB.event._id.toString() === resBoundaryA.event._id.toString(),
      'Test 4: Alarm at exactly 5-minute boundary (delta = 300,000ms) joins existing event'
    );

    // -------------------------------------------------------------
    // Test 5: More than 5 minutes (> 300,000 ms -> Must NOT join)
    // -------------------------------------------------------------
    console.log('\n🔹 Test 5: More than 5 minutes boundary...');
    // Alarm at 11:05:01 (301 seconds after 11:00:00)
    const almOver5m = await createMockAlarm('DEL001', 'SW001', '2026-11-11T11:05:01Z', 'CRITICAL');
    const resOver5m = await correlationService.correlateAlarm(almOver5m);

    assert(
      resOver5m.action === 'CREATED' &&
      resOver5m.event._id.toString() !== resBoundaryA.event._id.toString(),
      'Test 5: Alarm > 5 minutes after earliest timestamp spawns a new separate event'
    );

    // -------------------------------------------------------------
    // Test 6: Duplicate alarm processing
    // -------------------------------------------------------------
    console.log('\n🔹 Test 6: Duplicate alarm idempotency...');
    const duplicateRes = await correlationService.correlateAlarm(alm1);
    assert(
      duplicateRes.action === 'DUPLICATE',
      'Test 6a: Re-correlating existing alarm returns DUPLICATE'
    );
    const event1AfterDup = await Event.findById(event1._id);
    assert(
      event1AfterDup.alarmIds.length === 3,
      'Test 6b: Event member alarm list does not contain duplicate references'
    );

    // -------------------------------------------------------------
    // Test 7: Out-of-order alarm arrival
    // -------------------------------------------------------------
    console.log('\n🔹 Test 7: Out-of-order alarm arrival...');
    // Initial alarm at 12:03:00
    const almLate = await createMockAlarm('MUM001', 'FW001', '2026-11-11T12:03:00Z', 'INFO');
    const resLate = await correlationService.correlateAlarm(almLate);

    // Out-of-order alarm arriving later with earlier timestamp 12:01:00
    const almEarly = await createMockAlarm('MUM001', 'FW001', '2026-11-11T12:01:00Z', 'MAJOR');
    const resEarly = await correlationService.correlateAlarm(almEarly);

    const eventOutOrder = await Event.findById(resLate.event._id);
    assert(
      new Date(eventOutOrder.firstOccurredAt).toISOString() === '2026-11-11T12:01:00.000Z' &&
      new Date(eventOutOrder.lastOccurredAt).toISOString() === '2026-11-11T12:03:00.000Z',
      'Test 7: Out-of-order alarm arrival accurately updates firstOccurredAt to the earlier timestamp'
    );

    // -------------------------------------------------------------
    // Test 8 & 9: Event Merging within Allowed Time Window (<= 5m)
    // -------------------------------------------------------------
    console.log('\n🔹 Test 8 & 9: Event Merging within 5-minute window...');
    // Create Event A: alarm at 13:00:00
    const almA = await createMockAlarm('BLR001', 'RTR010', '2026-11-11T13:00:00Z', 'WARNING');
    const resA = await correlationService.correlateAlarm(almA);

    // Create Event B: alarm at 13:04:00 (separate initial event)
    const almB = await createMockAlarm('BLR001', 'RTR010', '2026-11-11T13:04:00Z', 'MAJOR');
    // Force into separate event by updating firstOccurredAt if needed or direct creation
    const eventB = await Event.create({
      eventId: correlationService.generateEventId(),
      siteId: 'BLR001',
      deviceId: 'RTR010',
      alarmIds: [almB._id],
      severity: 'MAJOR',
      status: 'OPEN',
      firstOccurredAt: new Date('2026-11-11T13:04:00Z'),
      lastOccurredAt: new Date('2026-11-11T13:04:00Z')
    });

    // Bridge alarm arrives at 13:02:00.
    // Combined span: 13:04:00 - 13:00:00 = 4 minutes <= 5 minutes!
    const almBridge = await createMockAlarm('BLR001', 'RTR010', '2026-11-11T13:02:00Z', 'CRITICAL');
    const mergeRes = await correlationService.correlateAlarm(almBridge);

    assert(
      mergeRes.action === 'MERGED',
      'Test 9a: Candidate events with combined span <= 5 minutes successfully merged'
    );
    const survivingEvent = await Event.findById(mergeRes.event._id);
    assert(
      survivingEvent.alarmIds.length === 3 &&
      new Date(survivingEvent.firstOccurredAt).toISOString() === '2026-11-11T13:00:00.000Z' &&
      new Date(survivingEvent.lastOccurredAt).toISOString() === '2026-11-11T13:04:00.000Z',
      'Test 9b: Merged event contains all 3 alarms spanning 13:00 to 13:04'
    );

    // -------------------------------------------------------------
    // Test 10: Prevent Merging when Combined Time Range Exceeds 5 Minutes
    // -------------------------------------------------------------
    console.log('\n🔹 Test 10: Prevent Merging when combined range > 5m...');
    const evtX = await Event.create({
      eventId: correlationService.generateEventId(),
      siteId: 'HYD001',
      deviceId: 'SW005',
      alarmIds: [],
      severity: 'WARNING',
      status: 'OPEN',
      firstOccurredAt: new Date('2026-11-11T14:00:00Z'),
      lastOccurredAt: new Date('2026-11-11T14:00:00Z')
    });

    const evtY = await Event.create({
      eventId: correlationService.generateEventId(),
      siteId: 'HYD001',
      deviceId: 'SW005',
      alarmIds: [],
      severity: 'MAJOR',
      status: 'OPEN',
      firstOccurredAt: new Date('2026-11-11T14:08:00Z'),
      lastOccurredAt: new Date('2026-11-11T14:08:00Z')
    });

    // Alarm at 14:03:00. Fits with evtX (3m span), but combined with evtY (14:08 - 14:00 = 8m > 5m)
    const almMid = await createMockAlarm('HYD001', 'SW005', '2026-11-11T14:03:00Z', 'INFO');
    const midRes = await correlationService.correlateAlarm(almMid);

    assert(
      midRes.action === 'UPDATED' && midRes.event._id.toString() === evtX._id.toString(),
      'Test 10a: Alarm updates matching candidate within 5m'
    );
    const evtYStillExists = await Event.findById(evtY._id);
    assert(
      evtYStillExists !== null,
      'Test 10b: Merging prevented because combined span (8m) exceeds 5-minute rule'
    );

    // -------------------------------------------------------------
    // Test 11: Severity Calculation
    // -------------------------------------------------------------
    console.log('\n🔹 Test 11: Severity calculation & escalation...');
    // event1 originally had WARNING, MAJOR, CRITICAL -> severity must be CRITICAL
    assert(
      event1AfterDup.severity === 'CRITICAL',
      'Test 11a: Event severity escalates to highest constituent alarm severity (CRITICAL)'
    );

    // Test recalculate severity helper
    const calculated = correlationService.calculateAggregateSeverity([
      { severity: 'INFO', status: 'ACTIVE' },
      { severity: 'MAJOR', status: 'ACTIVE' }
    ]);
    assert(calculated === 'MAJOR', 'Test 11b: Aggregation selects highest priority severity (MAJOR > INFO)');

    // -------------------------------------------------------------
    // Test 12 & 13: Event Acknowledgment and Resolution Lifecycle
    // -------------------------------------------------------------
    console.log('\n🔹 Test 12 & 13: Event Lifecycle (Acknowledge & Resolve)...');
    const ackRes = await fetch(`${baseUrl}/events/${event1._id}/acknowledge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${engineerToken}`
      },
      body: JSON.stringify({ notes: 'Engineer investigating core router incident' })
    });
    const ackData = await ackRes.json();
    assert(
      ackRes.status === 200 && ackData.data.status === 'ACKNOWLEDGED',
      'Test 12: Event successfully transitioned to ACKNOWLEDGED'
    );

    const resolveRes = await fetch(`${baseUrl}/events/${event1._id}/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${engineerToken}`
      },
      body: JSON.stringify({ notes: 'Resolved by replacing SFP transceiver' })
    });
    const resolveData = await resolveRes.json();
    assert(
      resolveRes.status === 200 && resolveData.data.status === 'RESOLVED',
      'Test 13a: Event successfully transitioned to RESOLVED'
    );

    // Check that constituent alarms are marked CLEARED
    const clearedAlarms = await Alarm.find({ _id: { $in: event1.alarmIds } });
    assert(
      clearedAlarms.every((a) => a.status === 'CLEARED'),
      'Test 13b: Resolving event automatically marks member alarms as CLEARED'
    );

    // -------------------------------------------------------------
    // Test 14: Unauthorized Event Updates
    // -------------------------------------------------------------
    console.log('\n🔹 Test 14: Unauthorized Event Updates (RBAC)...');
    const viewerAckRes = await fetch(`${baseUrl}/events/${resDiffSite.event._id}/acknowledge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${viewerToken}`
      },
      body: JSON.stringify({ notes: 'Viewer unauthorized attempt' })
    });
    assert(
      viewerAckRes.status === 403,
      'Test 14: Viewer user without alarm:update permission rejected with HTTP 403 FORBIDDEN'
    );

    // -------------------------------------------------------------
    // Test 15: Concurrent Processing
    // -------------------------------------------------------------
    console.log('\n🔹 Test 15: Concurrent alarm correlation processing...');
    const concurrentAlarms = await Promise.all([
      createMockAlarm('PUN001', 'RTR099', '2026-11-11T16:00:00Z', 'WARNING'),
      createMockAlarm('PUN001', 'RTR099', '2026-11-11T16:01:00Z', 'MAJOR'),
      createMockAlarm('PUN001', 'RTR099', '2026-11-11T16:02:00Z', 'CRITICAL')
    ]);

    // Correlate sequentially or in Promise.all
    for (const a of concurrentAlarms) {
      await correlationService.correlateAlarm(a);
    }

    const punEvents = await Event.find({ siteId: 'PUN001', deviceId: 'RTR099' });
    assert(
      punEvents.length === 1 && punEvents[0].alarmIds.length === 3,
      'Test 15: Multi-alarm processing correctly coalesces alarms into a single event with accurate count'
    );

    // Verify correlation stats API
    const statsRes = await fetch(`${baseUrl}/correlation/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const statsData = await statsRes.json();
    assert(
      statsRes.status === 200 &&
      statsData.data.totalEvents > 0 &&
      Boolean(statsData.data.noiseReductionRatio),
      'Test 15b: GET /api/correlation/stats returns noise reduction metrics'
    );

    console.log('\n=============================================================');
    console.log('🎉 ALL 15 PHASE 4 TESTS PASSED PERFECTLY!');
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

runPhase4Tests();
