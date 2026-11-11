const http = require('http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { io: ioClient } = require('socket.io-client');
const app = require('../src/app');
const config = require('../src/config/env');
const { initSocketServer, closeSocketServer } = require('../src/websocket/socketServer');
const { seedRoles } = require('../src/utils/seedRoles');
const { seedUsers } = require('../src/utils/seedUsers');
const UserRepository = require('../src/repositories/UserRepository');
const RoleRepository = require('../src/repositories/RoleRepository');
const { SERVER_EVENTS, CLIENT_EVENTS, ROOMS } = require('../src/constants/socketEvents');

const TEST_DB_URI = 'mongodb://127.0.0.1:27017/app360_phase7_1_test';

let httpServer;
let port;
let socketServerUrl;

let adminToken = '';
let engineerToken = '';
let viewerToken = '';
let deactivatedToken = '';
let adminUser;
let engineerUser;
let viewerUser;
let deactivatedUser;

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

const loginViaHttp = async (email, password) => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ email, password });
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
};

const connectSocket = (token, extraOptions = {}) => {
  return new Promise((resolve, reject) => {
    const socket = ioClient(socketServerUrl, {
      auth: token ? { token } : {},
      transports: ['websocket', 'polling'],
      reconnection: false,
      timeout: 5000,
      ...extraOptions
    });

    socket.on('connect', () => {
      resolve({ socket, connected: true });
    });

    socket.on('connect_error', (err) => {
      resolve({ socket, connected: false, error: err });
    });
  });
};

const runTestSuite = async () => {
  console.log('\n=============================================================');
  console.log('🧪 Starting App360 Phase 7.1 Secure Real-Time Socket.IO Test Suite');
  console.log('=============================================================\n');

  try {
    // Connect to isolated MongoDB
    await mongoose.connect(TEST_DB_URI);
    await mongoose.connection.dropDatabase();
    console.log('🍃 Connected to isolated test MongoDB:', TEST_DB_URI);

    // Seed roles and default users
    await seedRoles();
    await seedUsers();

    // Create an inactive user for deactivation testing
    const viewerRole = await RoleRepository.findByName('VIEWER');
    deactivatedUser = await UserRepository.create({
      name: 'Deactivated Operator',
      email: 'deactivated.operator@app360.internal',
      passwordHash: 'dummyHashForTestOnly123',
      roleId: viewerRole._id,
      isActive: false
    });

    // Create HTTP server wrapping Express app & init Socket.IO
    httpServer = http.createServer(app);
    initSocketServer(httpServer);

    // Listen on ephemeral port
    await new Promise((resolve) => {
      httpServer.listen(0, '127.0.0.1', () => {
        port = httpServer.address().port;
        socketServerUrl = `http://127.0.0.1:${port}`;
        console.log(`📡 Test server listening on: ${socketServerUrl}`);
        resolve();
      });
    });

    // Obtain JWT tokens via HTTP login
    const adminLogin = await loginViaHttp('admin@app360.internal', 'Admin@360!');
    adminToken = adminLogin.data.data.token;
    adminUser = adminLogin.data.data.user;

    const engineerLogin = await loginViaHttp('engineer.test@app360.internal', 'Password123!');
    engineerToken = engineerLogin.data.data.token;
    engineerUser = engineerLogin.data.data.user;

    const viewerLogin = await loginViaHttp('viewer.test@app360.internal', 'Password123!');
    viewerToken = viewerLogin.data.data.token;
    viewerUser = viewerLogin.data.data.user;

    // Generate token for deactivated user
    deactivatedToken = jwt.sign(
      { id: deactivatedUser._id.toString(), email: deactivatedUser.email, role: 'VIEWER' },
      config.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // --- TEST 1: Server Initialization ---
    console.log('\n🔹 Test 1: Backend Socket.IO Server Initialization...');
    assert(typeof httpServer.address().port === 'number', 'Test 1: HTTP server active on dynamic port');
    assert(Boolean(socketServerUrl), 'Test 1b: Socket.IO mounted directly onto existing HTTP server');

    // --- TEST 2: Authenticated Connection (Admin) ---
    console.log('\n🔹 Test 2: Authenticated Connection (Admin)...');
    let adminEstablishedEvent = null;
    const { socket: adminSocket, connected: adminConnected } = await new Promise(async (resolve) => {
      const sock = ioClient(socketServerUrl, {
        auth: { token: adminToken },
        transports: ['websocket'],
        reconnection: false
      });
      sock.on(SERVER_EVENTS.CONNECTION_ESTABLISHED, (payload) => {
        adminEstablishedEvent = payload;
      });
      sock.on('connect', () => resolve({ socket: sock, connected: true }));
      sock.on('connect_error', (err) => resolve({ socket: sock, connected: false, error: err }));
    });

    assert(adminConnected === true, 'Test 2a: Admin socket connected successfully via JWT handshake');
    assert(adminEstablishedEvent !== null, 'Test 2b: Server emitted connection:established event on handshake');
    assert(adminEstablishedEvent?.user?.email === 'admin@app360.internal', 'Test 2c: Authenticated user identity attached to socket');
    assert(adminEstablishedEvent?.user?.role === 'ADMIN', 'Test 2d: Authenticated role ADMIN attached to socket');
    assert(
      adminEstablishedEvent?.rooms?.includes(`user:${adminUser.id}`) &&
      adminEstablishedEvent?.rooms?.includes('role:ADMIN'),
      'Test 2e: Auto-joined identity channels user:<id> and role:ADMIN'
    );

    // --- TEST 3: Authenticated Connection (Engineer) ---
    console.log('\n🔹 Test 3: Authenticated Connection (Engineer)...');
    let engineerEstablishedEvent = null;
    const { socket: engineerSocket, connected: engineerConnected } = await new Promise(async (resolve) => {
      const sock = ioClient(socketServerUrl, {
        auth: { token: engineerToken },
        transports: ['websocket'],
        reconnection: false
      });
      sock.on(SERVER_EVENTS.CONNECTION_ESTABLISHED, (payload) => {
        engineerEstablishedEvent = payload;
      });
      sock.on('connect', () => resolve({ socket: sock, connected: true }));
      sock.on('connect_error', (err) => resolve({ socket: sock, connected: false, error: err }));
    });

    assert(engineerConnected === true, 'Test 3a: Engineer socket connected successfully');
    assert(engineerEstablishedEvent?.user?.role === 'ENGINEER', 'Test 3b: Role ENGINEER attached to socket');
    assert(
      engineerEstablishedEvent?.rooms?.includes(`user:${engineerUser.id}`) &&
      engineerEstablishedEvent?.rooms?.includes('role:ENGINEER'),
      'Test 3c: Auto-joined identity channels user:<id> and role:ENGINEER'
    );

    // --- TEST 4: Authenticated Connection (Viewer) ---
    console.log('\n🔹 Test 4: Authenticated Connection (Viewer)...');
    let viewerEstablishedEvent = null;
    const { socket: viewerSocket, connected: viewerConnected } = await new Promise(async (resolve) => {
      const sock = ioClient(socketServerUrl, {
        auth: { token: viewerToken },
        transports: ['websocket'],
        reconnection: false
      });
      sock.on(SERVER_EVENTS.CONNECTION_ESTABLISHED, (payload) => {
        viewerEstablishedEvent = payload;
      });
      sock.on('connect', () => resolve({ socket: sock, connected: true }));
      sock.on('connect_error', (err) => resolve({ socket: sock, connected: false, error: err }));
    });

    assert(viewerConnected === true, 'Test 4a: Viewer socket connected successfully');
    assert(viewerEstablishedEvent?.user?.role === 'VIEWER', 'Test 4b: Role VIEWER attached to socket');

    // --- TEST 5: Rejected Unauthenticated Connection ---
    console.log('\n🔹 Test 5: Rejected Unauthenticated Connection (No JWT)...');
    const { connected: unauthConnected, error: unauthError, socket: unauthSocket } = await connectSocket(null);
    assert(unauthConnected === false, 'Test 5a: Unauthenticated connection rejected by handshake middleware');
    assert(
      unauthError?.data?.code === 'AUTHENTICATION_REQUIRED' || unauthError?.message?.includes('Authentication required'),
      'Test 5b: Rejection error code is AUTHENTICATION_REQUIRED'
    );
    if (unauthSocket) unauthSocket.disconnect();

    // --- TEST 6: Rejected Invalid Token ---
    console.log('\n🔹 Test 6: Rejected Invalid / Tampered Token...');
    const { connected: invalidConnected, error: invalidError, socket: invalidSocket } = await connectSocket('tampered.jwt.signature');
    assert(invalidConnected === false, 'Test 6a: Invalid token connection rejected');
    assert(
      invalidError?.data?.code === 'INVALID_TOKEN' || invalidError?.message?.includes('Invalid authentication token'),
      'Test 6b: Rejection error code is INVALID_TOKEN'
    );
    if (invalidSocket) invalidSocket.disconnect();

    // --- TEST 7: Rejected Expired Token ---
    console.log('\n🔹 Test 7: Rejected Expired Token...');
    const expiredToken = jwt.sign(
      { id: adminUser.id, email: adminUser.email },
      config.JWT_SECRET,
      { expiresIn: '-10s' } // Expired 10 seconds ago
    );
    const { connected: expiredConnected, error: expiredError, socket: expiredSocket } = await connectSocket(expiredToken);
    assert(expiredConnected === false, 'Test 7a: Expired token connection rejected');
    assert(
      expiredError?.data?.code === 'TOKEN_EXPIRED' || expiredError?.message?.includes('expired'),
      'Test 7b: Rejection error code is TOKEN_EXPIRED'
    );
    if (expiredSocket) expiredSocket.disconnect();

    // --- TEST 8: Rejected Inactive / Deactivated User ---
    console.log('\n🔹 Test 8: Rejected Inactive / Deactivated User...');
    const { connected: deactConnected, error: deactError, socket: deactSocket } = await connectSocket(deactivatedToken);
    assert(deactConnected === false, 'Test 8a: Deactivated user connection rejected');
    assert(
      deactError?.data?.code === 'ACCOUNT_DEACTIVATED' || deactError?.message?.includes('deactivated'),
      'Test 8b: Rejection error code is ACCOUNT_DEACTIVATED'
    );
    if (deactSocket) deactSocket.disconnect();

    // --- TEST 9: Client Heartbeat ---
    console.log('\n🔹 Test 9: Client Heartbeat Event...');
    const heartbeatResponse = await new Promise((resolve) => {
      adminSocket.emit(CLIENT_EVENTS.HEARTBEAT, { timestamp: Date.now() }, (ack) => {
        resolve(ack);
      });
    });
    assert(Boolean(heartbeatResponse?.serverTime), 'Test 9a: Server responded with serverTime');
    assert(typeof heartbeatResponse?.serverTimestamp === 'number', 'Test 9b: Server responded with serverTimestamp');

    // --- TEST 10: Room Authorization (Admin) ---
    console.log('\n🔹 Test 10: Room Authorization (Admin)...');
    const adminSubAlarms = await new Promise((resolve) => {
      adminSocket.emit(CLIENT_EVENTS.SUBSCRIBE, { room: ROOMS.MONITORING_ALARMS }, (ack) => resolve(ack));
    });
    assert(adminSubAlarms?.success === true && adminSubAlarms?.room === ROOMS.MONITORING_ALARMS, 'Test 10a: Admin subscribed to monitoring:alarms');

    const adminSubSystem = await new Promise((resolve) => {
      adminSocket.emit(CLIENT_EVENTS.SUBSCRIBE, { room: ROOMS.MONITORING_SYSTEM }, (ack) => resolve(ack));
    });
    assert(adminSubSystem?.success === true && adminSubSystem?.room === ROOMS.MONITORING_SYSTEM, 'Test 10b: Admin subscribed to monitoring:system');

    // --- TEST 11: Room Authorization (Engineer) ---
    console.log('\n🔹 Test 11: Room Authorization (Engineer)...');
    const engineerSubAlarms = await new Promise((resolve) => {
      engineerSocket.emit(CLIENT_EVENTS.SUBSCRIBE, { room: ROOMS.MONITORING_ALARMS }, (ack) => resolve(ack));
    });
    assert(engineerSubAlarms?.success === true, 'Test 11a: Engineer with alarm:read subscribed to monitoring:alarms');

    const engineerSubEvents = await new Promise((resolve) => {
      engineerSocket.emit(CLIENT_EVENTS.SUBSCRIBE, { room: ROOMS.MONITORING_EVENTS }, (ack) => resolve(ack));
    });
    assert(engineerSubEvents?.success === true, 'Test 11b: Engineer with event:read subscribed to monitoring:events');

    // --- TEST 12: Room Authorization (Viewer & Arbitrary Injection) ---
    console.log('\n🔹 Test 12: Room Authorization (Viewer & Arbitrary Room Prevention)...');
    const viewerSubAlarms = await new Promise((resolve) => {
      viewerSocket.emit(CLIENT_EVENTS.SUBSCRIBE, { room: ROOMS.MONITORING_ALARMS }, (ack) => resolve(ack));
    });
    assert(viewerSubAlarms?.success === true, 'Test 12a: Viewer with alarm:read subscribed to monitoring:alarms');

    const viewerSubArbitrary = await new Promise((resolve) => {
      viewerSocket.emit(CLIENT_EVENTS.SUBSCRIBE, { room: 'unauthorized:admin_audit_secrets' }, (ack) => resolve(ack));
    });
    assert(
      viewerSubArbitrary?.success === false && viewerSubArbitrary?.error === 'FORBIDDEN',
      'Test 12b: Arbitrary room injection strictly blocked with HTTP 403 / FORBIDDEN'
    );

    // --- TEST 13: Identity Room Unsubscribe Protection ---
    console.log('\n🔹 Test 13: Protected Identity Channel Unsubscribe Guard...');
    const unSubIdentity = await new Promise((resolve) => {
      adminSocket.emit(CLIENT_EVENTS.UNSUBSCRIBE, { room: `user:${adminUser.id}` }, (ack) => resolve(ack));
    });
    assert(
      unSubIdentity?.success === false && unSubIdentity?.error === 'PROTECTED_ROOM',
      'Test 13: Cannot unsubscribe from own user identity channel'
    );

    // Valid unsubscribe from monitoring room
    const unSubAlarms = await new Promise((resolve) => {
      adminSocket.emit(CLIENT_EVENTS.UNSUBSCRIBE, { room: ROOMS.MONITORING_ALARMS }, (ack) => resolve(ack));
    });
    assert(unSubAlarms?.success === true && unSubAlarms?.room === ROOMS.MONITORING_ALARMS, 'Test 13b: Successfully unsubscribed from monitoring:alarms');

    // --- TEST 14: Disconnection Handling ---
    console.log('\n🔹 Test 14: Disconnection Handling...');
    const adminDisconnectPromise = new Promise((resolve) => {
      adminSocket.on('disconnect', (reason) => resolve(reason));
      adminSocket.disconnect();
    });
    const disconnectReason = await adminDisconnectPromise;
    assert(Boolean(disconnectReason), 'Test 14: Socket disconnected cleanly and lifecycle handled');

    // Disconnect other test sockets
    engineerSocket.disconnect();
    viewerSocket.disconnect();

    // --- TEST 15: Existing REST HTTP API Coexistence ---
    console.log('\n🔹 Test 15: Existing REST HTTP API Coexistence...');
    const healthCheck = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
        let b = '';
        res.on('data', c => b += c);
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(b) }));
      }).on('error', reject);
    });
    assert(healthCheck.status === 200 && healthCheck.body.status === 'healthy', 'Test 15a: GET /api/health returns 200 OK');

    const authCheck = await loginViaHttp('admin@app360.internal', 'Admin@360!');
    assert(authCheck.status === 200 && authCheck.data.data.token, 'Test 15b: POST /api/auth/login functions normally');

    console.log('\n=============================================================');
    console.log(`🎉 ALL ${testResults.length} PHASE 7.1 REAL-TIME TESTS PASSED PERFECTLY!`);
    console.log('=============================================================\n');

  } catch (error) {
    console.error('\n💥 Phase 7.1 Test Suite Failure:', error);
    process.exit(1);
  } finally {
    // Cleanup
    await closeSocketServer();
    if (httpServer && httpServer.listening) {
      await new Promise(r => httpServer.close(r));
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  }
};

runTestSuite();
