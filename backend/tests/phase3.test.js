const mongoose = require('mongoose');
const app = require('../src/app');
const Role = require('../src/models/Role');
const User = require('../src/models/User');
const Alarm = require('../src/models/Alarm');
const RawAlarmPayload = require('../src/models/RawAlarmPayload');
const IngestionLog = require('../src/models/IngestionLog');
const { seedRoles } = require('../src/utils/seedRoles');
const bootstrapAdmin = require('../src/utils/bootstrapAdmin');

const SourceAAdapter = require('../src/adapters/SourceAAdapter');
const SourceBAdapter = require('../src/adapters/SourceBAdapter');
const SourceCAdapter = require('../src/adapters/SourceCAdapter');
const AlarmNormalizer = require('../src/services/AlarmNormalizer');
const IngestionService = require('../src/services/IngestionService');
const { startIngestionJob, stopIngestionJob, isSchedulerRunning } = require('../src/jobs/ingestion.job');

const TEST_DB_URI = 'mongodb://127.0.0.1:27017/app360_phase3_test';

let server;
let baseUrl;
let adminToken = '';
let viewerToken = '';

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    console.error(`  ❌ [FAIL] ${testName} - ${details}`);
    throw new Error(`Assertion failed: ${testName} - ${details}`);
  }
}

async function runPhase3Tests() {
  console.log('\n=============================================================');
  console.log('🧪 Starting App360 Phase 3 Test Suite (Multi-Source Ingestion)');
  console.log('=============================================================\n');

  try {
    // Connect to isolated test database
    await mongoose.connect(TEST_DB_URI, {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000
    });
    await mongoose.connection.dropDatabase();

    // Start HTTP server
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}/api`;
        resolve();
      });
    });

    // Seed roles & bootstrap admin
    await seedRoles();
    process.env.ADMIN_EMAIL = 'admin@app360.internal';
    process.env.ADMIN_PASSWORD = 'AdminSecurePassword2026!';
    await bootstrapAdmin();

    // Login as Admin
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

    // Create a viewer user for RBAC test
    const viewerRole = await Role.findOne({ name: 'VIEWER' });
    const createViewerRes = await fetch(`${baseUrl}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'Viewer Tester',
        email: 'viewer.test@app360.internal',
        password: 'ViewerPassword123!',
        roleId: viewerRole._id.toString()
      })
    });
    const viewerData = await createViewerRes.json();

    const viewLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'viewer.test@app360.internal',
        password: 'ViewerPassword123!'
      })
    });
    const viewLoginData = await viewLoginRes.json();
    viewerToken = viewLoginData.data.token;

    // -------------------------------------------------------------
    // Test 1: Source A Adapter
    // -------------------------------------------------------------
    console.log('🔹 Testing Source A Adapter...');
    const rawA = await SourceAAdapter.fetchRawData({ useDirectService: true });
    assert(Array.isArray(rawA) && rawA.length > 0, 'Test 1a: Source A returns valid raw telemetry items');
    const transformedA = SourceAAdapter.transform(rawA[0]);
    assert(
      transformedA.sourceId === 'SOURCE_A' &&
      transformedA.externalAlarmId === 'NET-1001' &&
      transformedA.siteId === 'CHN001' &&
      transformedA.deviceId === 'RTR001',
      'Test 1b: Source A transform maps custom fields to candidate format'
    );

    // -------------------------------------------------------------
    // Test 2: Source B Adapter
    // -------------------------------------------------------------
    console.log('\n🔹 Testing Source B Adapter...');
    const rawB = await SourceBAdapter.fetchRawData({ useDirectService: true });
    assert(Array.isArray(rawB) && rawB.length > 0, 'Test 2a: Source B returns valid raw telemetry items');
    const transformedB = SourceBAdapter.transform(rawB[0]);
    assert(
      transformedB.sourceId === 'SOURCE_B' &&
      transformedB.externalAlarmId === 'INF-2001' &&
      transformedB.siteId === 'CHN001' &&
      transformedB.deviceId === 'RTR001',
      'Test 2b: Source B transform maps nested incident object to candidate format'
    );

    // -------------------------------------------------------------
    // Test 3: Source C Adapter
    // -------------------------------------------------------------
    console.log('\n🔹 Testing Source C Adapter...');
    const rawC = await SourceCAdapter.fetchRawData({ useDirectService: true });
    assert(Array.isArray(rawC) && rawC.length > 0, 'Test 3a: Source C returns valid raw telemetry items');
    const transformedC = SourceCAdapter.transform(rawC[0]);
    assert(
      transformedC.sourceId === 'SOURCE_C' &&
      transformedC.externalAlarmId === 'CON-3001' &&
      transformedC.siteId === 'CHN001' &&
      transformedC.deviceId === 'RTR001',
      'Test 3b: Source C transform maps nested asset object to candidate format'
    );

    // -------------------------------------------------------------
    // Test 4: Canonical Alarm Normalization (Heterogeneous -> Uniform)
    // -------------------------------------------------------------
    console.log('\n🔹 Testing Canonical Alarm Normalization...');
    const canonicalA = AlarmNormalizer.normalize(transformedA);
    const canonicalB = AlarmNormalizer.normalize(transformedB);
    const canonicalC = AlarmNormalizer.normalize(transformedC);

    const requiredKeys = ['sourceId', 'externalAlarmId', 'siteId', 'deviceId', 'alarmType', 'severity', 'message', 'timestamp', 'status', 'rawPayload'];
    const hasAllKeysA = requiredKeys.every((k) => k in canonicalA);
    const hasAllKeysB = requiredKeys.every((k) => k in canonicalB);
    const hasAllKeysC = requiredKeys.every((k) => k in canonicalC);

    assert(
      hasAllKeysA && hasAllKeysB && hasAllKeysC &&
      canonicalA.severity === 'CRITICAL' &&
      canonicalB.severity === 'CRITICAL' && // P1 mapped to CRITICAL
      canonicalC.severity === 'MAJOR',
      'Test 4: All 3 heterogeneous sources successfully normalized into identical canonical format'
    );

    // -------------------------------------------------------------
    // Test 5: Severity Mapping (Strict validation, no silent conversion)
    // -------------------------------------------------------------
    console.log('\n🔹 Testing Severity Mapping Rules...');
    assert(AlarmNormalizer.mapSeverity('CRITICAL') === 'CRITICAL', 'Test 5a: CRITICAL -> CRITICAL');
    assert(AlarmNormalizer.mapSeverity('P1') === 'CRITICAL', 'Test 5b: P1 -> CRITICAL');
    assert(AlarmNormalizer.mapSeverity('P2') === 'MAJOR', 'Test 5c: P2 -> MAJOR');
    assert(AlarmNormalizer.mapSeverity('P3') === 'MINOR', 'Test 5d: P3 -> MINOR');
    assert(AlarmNormalizer.mapSeverity('WARNING') === 'WARNING', 'Test 5e: WARNING -> WARNING');
    assert(AlarmNormalizer.mapSeverity('INFO') === 'INFO', 'Test 5f: INFO -> INFO');

    let unknownRejected = false;
    try {
      AlarmNormalizer.mapSeverity('RANDOM_CUSTOM_SEVERITY');
    } catch {
      unknownRejected = true;
    }
    assert(unknownRejected, 'Test 5g: Unknown severity value is explicitly rejected with an error');

    // -------------------------------------------------------------
    // Test 6: Timestamp Normalization
    // -------------------------------------------------------------
    console.log('\n🔹 Testing Timestamp Normalization...');
    const isoDate = AlarmNormalizer.normalizeTimestamp('2026-11-11T10:00:00Z');
    assert(isoDate instanceof Date && !isNaN(isoDate.getTime()), 'Test 6a: ISO string parsed to Date');

    const epochMsDate = AlarmNormalizer.normalizeTimestamp(1731319200000);
    assert(epochMsDate instanceof Date && !isNaN(epochMsDate.getTime()), 'Test 6b: Epoch ms parsed to Date');

    let badTimestampRejected = false;
    try {
      AlarmNormalizer.normalizeTimestamp('not-a-valid-date');
    } catch {
      badTimestampRejected = true;
    }
    assert(badTimestampRejected, 'Test 6c: Invalid timestamp string is rejected');

    // -------------------------------------------------------------
    // Test 7: Invalid Source Payloads
    // -------------------------------------------------------------
    console.log('\n🔹 Testing Invalid Source Payloads...');
    let invalidPayloadRejected = false;
    try {
      SourceAAdapter.transform('string_payload_not_object');
    } catch {
      invalidPayloadRejected = true;
    }
    assert(invalidPayloadRejected, 'Test 7: Non-object raw item rejected by adapter transform');

    // -------------------------------------------------------------
    // Test 8: Missing Required Fields
    // -------------------------------------------------------------
    console.log('\n🔹 Testing Missing Required Fields Validation...');
    let missingDeviceRejected = false;
    try {
      AlarmNormalizer.normalize({
        sourceId: 'SOURCE_A',
        externalAlarmId: 'NET-999',
        siteId: 'CHN001',
        // deviceId is missing!
        alarmType: 'HIGH_CPU',
        severity: 'CRITICAL',
        message: 'CPU high',
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      missingDeviceRejected = err.message.includes('deviceId is required');
    }
    assert(missingDeviceRejected, 'Test 8: Normalized candidate missing deviceId rejected with validation error');

    // -------------------------------------------------------------
    // Test 9 & 10: Ingestion Execution, Raw Preservation & Deduplication
    // -------------------------------------------------------------
    console.log('\n🔹 Testing Full Ingestion Cycle, Raw Preservation & Deduplication...');
    const batch1 = await IngestionService.executeIngestion({ useDirectService: true, triggeredBy: 'MANUAL' });
    assert(batch1.status === 'SUCCESS' && batch1.totalNormalized > 0, 'Test 9a: Initial batch ingests all unique alarms');

    const alarmsAfterBatch1 = await Alarm.find({});
    const rawPayloadsCount = await RawAlarmPayload.countDocuments({});
    assert(
      alarmsAfterBatch1.length === batch1.totalNormalized &&
      rawPayloadsCount === batch1.totalFetched,
      'Test 10: Raw payloads are immutably preserved in raw_alarm_payloads collection'
    );

    // Verify compound index uniqueness: execute the exact same batch again
    const batch2 = await IngestionService.executeIngestion({ useDirectService: true, triggeredBy: 'MANUAL' });
    const alarmsAfterBatch2 = await Alarm.find({});
    assert(
      alarmsAfterBatch2.length === alarmsAfterBatch1.length,
      'Test 9b: Duplicate alarms did NOT create new database records (Unique compound index enforced)'
    );
    assert(
      batch2.totalDuplicates === batch1.totalNormalized,
      'Test 9c: All re-ingested alarms recognized as duplicates and incremented repeatCount'
    );
    const sampleAlarm = await Alarm.findOne({ externalAlarmId: 'NET-1001' });
    assert(sampleAlarm.repeatCount === 2, 'Test 9d: Existing alarm repeatCount incremented to 2');

    // -------------------------------------------------------------
    // Test 11: Source API Failures
    // -------------------------------------------------------------
    console.log('\n🔹 Testing Source API Failure Handling...');
    let sourceBFailureCaught = false;
    try {
      await SourceBAdapter.fetchRawData({ useDirectService: true, simulateFailure: true });
    } catch (err) {
      sourceBFailureCaught = true;
    }
    assert(sourceBFailureCaught, 'Test 11: Adapter properly propagates simulated source failure');

    // -------------------------------------------------------------
    // Test 12: Partial Ingestion Failures (Independent Fault Isolation)
    // -------------------------------------------------------------
    console.log('\n🔹 Testing Partial Ingestion (Fault Isolation)...');
    // Set Source B to simulate failure
    const mockSourcesService = require('../src/services/mockSources.service');
    mockSourcesService.setSimulatedFailure('SOURCE_B', true);

    const partialBatch = await IngestionService.executeIngestion({ useDirectService: true, triggeredBy: 'MANUAL' });
    mockSourcesService.setSimulatedFailure('SOURCE_B', false); // Reset

    assert(
      partialBatch.status === 'PARTIAL',
      'Test 12a: Batch marked as PARTIAL when one source fails'
    );
    const sourceBResult = partialBatch.sources.find((s) => s.sourceId === 'SOURCE_B');
    const sourceAResult = partialBatch.sources.find((s) => s.sourceId === 'SOURCE_A');
    assert(
      sourceBResult.status === 'FAILED' && sourceAResult.status === 'SUCCESS',
      'Test 12b: Source B failure did not block Source A or Source C from processing'
    );

    // -------------------------------------------------------------
    // Test 13: Manual Ingestion API Endpoint
    // -------------------------------------------------------------
    console.log('\n🔹 Testing Manual Ingestion API Endpoint...');
    const triggerRes = await fetch(`${baseUrl}/ingestion/trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      }
    });
    const triggerData = await triggerRes.json();
    assert(
      triggerRes.status === 200 &&
      triggerData.success === true &&
      Boolean(triggerData.data.batchId),
      'Test 13a: POST /api/ingestion/trigger successfully runs ingestion and returns batch metrics'
    );

    const logsRes = await fetch(`${baseUrl}/ingestion/logs`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const logsData = await logsRes.json();
    assert(
      logsRes.status === 200 &&
      logsData.data.length > 0,
      'Test 13b: GET /api/ingestion/logs returns paginated audit records'
    );

    // Test alarm listing with filter
    const alarmsRes = await fetch(`${baseUrl}/alarms?severity=CRITICAL`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const alarmsData = await alarmsRes.json();
    assert(
      alarmsRes.status === 200 &&
      alarmsData.data.every((a) => a.severity === 'CRITICAL'),
      'Test 13c: GET /api/alarms?severity=CRITICAL properly filters normalized alarms'
    );

    // Test raw drill-down endpoint
    const firstAlarm = alarmsData.data[0];
    const rawDrillRes = await fetch(`${baseUrl}/alarms/${firstAlarm.id}/raw`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const rawDrillData = await rawDrillRes.json();
    assert(
      rawDrillRes.status === 200 &&
      Boolean(rawDrillData.data.rawPayload),
      'Test 13d: GET /api/alarms/:id/raw returns lossless raw JSON payload for forensic drill-down'
    );

    // -------------------------------------------------------------
    // Test 14: Scheduled Ingestion
    // -------------------------------------------------------------
    console.log('\n🔹 Testing Scheduled Ingestion (node-cron)...');
    const task = startIngestionJob();
    assert(isSchedulerRunning() === true, 'Test 14a: Ingestion cron scheduler starts successfully');
    const duplicateTask = startIngestionJob();
    assert(duplicateTask === task, 'Test 14b: Scheduler start is idempotent (duplicate instances prevented)');
    stopIngestionJob();
    assert(isSchedulerRunning() === false, 'Test 14c: Ingestion scheduler stopped gracefully');

    // -------------------------------------------------------------
    // Test 15: Authorization Checks
    // -------------------------------------------------------------
    console.log('\n🔹 Testing Authorization Checks on Ingestion & Alarms...');
    const noTokenRes = await fetch(`${baseUrl}/ingestion/trigger`, { method: 'POST' });
    assert(
      noTokenRes.status === 401,
      'Test 15a: Ingestion trigger without token rejected with HTTP 401 UNAUTHORIZED'
    );

    // Viewer user lacks api:create permission -> should be rejected with 403 Forbidden
    const viewerTriggerRes = await fetch(`${baseUrl}/ingestion/trigger`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${viewerToken}` }
    });
    assert(
      viewerTriggerRes.status === 403,
      'Test 15b: Viewer user attempting manual ingestion trigger rejected with HTTP 403 FORBIDDEN'
    );

    console.log('\n=============================================================');
    console.log('🎉 ALL 15 PHASE 3 TESTS PASSED PERFECTLY!');
    console.log('=============================================================\n');
  } catch (err) {
    console.error('\n💥 TEST EXECUTION FAILED:', err.message);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
    stopIngestionJob();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
    }
  }
}

runPhase3Tests();

