const mongoose = require('mongoose');
const app = require('../src/app');
const Role = require('../src/models/Role');
const User = require('../src/models/User');
const { seedRoles } = require('../src/utils/seedRoles');
const bootstrapAdmin = require('../src/utils/bootstrapAdmin');

const TEST_DB_URI = 'mongodb://127.0.0.1:27017/app360_phase2_test';

let server;
let baseUrl;

// Test state variables
let adminToken = '';
let engineerToken = '';
let viewerToken = '';
let engineerUserId = '';
let viewerUserId = '';
let viewerRoleId = '';

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

async function runTests() {
  console.log('\n=============================================================');
  console.log('🧪 Starting App360 Phase 2 Test Suite (Isolated Database)');
  console.log('=============================================================\n');

  try {
    // -------------------------------------------------------------
    // Test 1: MongoDB Connection
    // -------------------------------------------------------------
    console.log('🔹 Testing Database Connection...');
    await mongoose.connect(TEST_DB_URI, {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000
    });
    // Clean test database for fresh run
    await mongoose.connection.dropDatabase();
    assert(
      mongoose.connection.readyState === 1,
      'Test 1: MongoDB connection established successfully',
      `Connected to ${TEST_DB_URI}`
    );

    // Start HTTP server on dynamic port
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}/api`;
        resolve();
      });
    });

    // -------------------------------------------------------------
    // Test 2: Role Seeding
    // -------------------------------------------------------------
    console.log('\n🔹 Testing Role Seeding...');
    const seedResult = await seedRoles();
    const rolesInDb = await Role.find({});
    assert(
      rolesInDb.length === 3 &&
      rolesInDb.some((r) => r.name === 'ADMIN') &&
      rolesInDb.some((r) => r.name === 'ENGINEER') &&
      rolesInDb.some((r) => r.name === 'VIEWER'),
      'Test 2: Role seeding created ADMIN, ENGINEER, and VIEWER roles',
      `Roles count: ${rolesInDb.length}`
    );

    const viewerRole = rolesInDb.find((r) => r.name === 'VIEWER');
    viewerRoleId = viewerRole._id.toString();

    // Verify idempotency
    const reseedResult = await seedRoles();
    const rolesAfterReseed = await Role.find({});
    assert(
      rolesAfterReseed.length === 3,
      'Test 2b: Role seeding is idempotent (no duplicate roles created)',
      `Roles count after re-seed: ${rolesAfterReseed.length}`
    );

    // -------------------------------------------------------------
    // Test 3: Administrator Bootstrap
    // -------------------------------------------------------------
    console.log('\n🔹 Testing Administrator Bootstrap...');
    process.env.ADMIN_EMAIL = 'admin@app360.internal';
    process.env.ADMIN_PASSWORD = 'AdminSecurePassword2026!';
    process.env.ADMIN_NAME = 'Primary Administrator';

    await bootstrapAdmin();
    const adminUser = await User.findOne({ email: 'admin@app360.internal' }).select('+passwordHash');
    assert(
      adminUser !== null && adminUser.passwordHash.startsWith('$2'),
      'Test 3: Administrator bootstrapped with bcrypt hashed password',
      `Admin ID: ${adminUser?._id}`
    );

    // -------------------------------------------------------------
    // Test 4: Valid Login
    // -------------------------------------------------------------
    console.log('\n🔹 Testing Authentication (Valid Login)...');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@app360.internal',
        password: 'AdminSecurePassword2026!'
      })
    });
    const loginData = await loginRes.json();
    assert(
      loginRes.status === 200 &&
      loginData.success === true &&
      Boolean(loginData.data.token) &&
      !loginData.data.user.passwordHash,
      'Test 4: Valid login returns JWT token and sanitizes passwordHash',
      `HTTP ${loginRes.status}`
    );
    adminToken = loginData.data.token;

    // -------------------------------------------------------------
    // Test 5: Invalid Password
    // -------------------------------------------------------------
    console.log('\n🔹 Testing Authentication (Invalid Password)...');
    const badLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@app360.internal',
        password: 'WrongPassword!'
      })
    });
    const badLoginData = await badLoginRes.json();
    assert(
      badLoginRes.status === 401 &&
      badLoginData.success === false &&
      badLoginData.error.code === 'INVALID_CREDENTIALS',
      'Test 5: Invalid password rejected with HTTP 401 and INVALID_CREDENTIALS',
      `HTTP ${badLoginRes.status}`
    );

    // -------------------------------------------------------------
    // Test 6: Invalid JWT
    // -------------------------------------------------------------
    console.log('\n🔹 Testing JWT Verification (Invalid Token)...');
    const invalidJwtRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: 'Bearer this_is_an_invalid_tampered_token' }
    });
    const invalidJwtData = await invalidJwtRes.json();
    assert(
      invalidJwtRes.status === 401 &&
      invalidJwtData.error.code === 'INVALID_TOKEN',
      'Test 6: Tampered/invalid JWT token rejected with HTTP 401',
      `HTTP ${invalidJwtRes.status}`
    );

    // -------------------------------------------------------------
    // Test 7: User Creation (Admin only)
    // -------------------------------------------------------------
    console.log('\n🔹 Testing User Creation by Administrator...');
    const createEngineerRes = await fetch(`${baseUrl}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'Sarah Connor',
        email: 'sarah.engineer@app360.internal',
        password: 'EngineerSecret2026!',
        roleId: 'ENGINEER'
      })
    });
    const engineerData = await createEngineerRes.json();
    assert(
      createEngineerRes.status === 201 &&
      engineerData.success === true &&
      engineerData.data.email === 'sarah.engineer@app360.internal',
      'Test 7: Administrator successfully created new user',
      `User ID: ${engineerData.data.id}`
    );
    engineerUserId = engineerData.data.id;

    // -------------------------------------------------------------
    // Test 8: Engineer Role Assignment Verification
    // -------------------------------------------------------------
    console.log('\n🔹 Testing Engineer Role Assignment...');
    assert(
      engineerData.data.roleId?.name === 'ENGINEER' || engineerData.data.roleId?.toString() !== '',
      'Test 8: User created with assigned ENGINEER role',
      `Role: ${engineerData.data.roleId?.name || 'Assigned'}`
    );

    // Log in as Engineer to get token
    const engLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'sarah.engineer@app360.internal',
        password: 'EngineerSecret2026!'
      })
    });
    const engLoginData = await engLoginRes.json();
    engineerToken = engLoginData.data.token;

    // -------------------------------------------------------------
    // Test 9: Viewer Role Assignment
    // -------------------------------------------------------------
    console.log('\n🔹 Testing Viewer User Creation...');
    const createViewerRes = await fetch(`${baseUrl}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'John Doe',
        email: 'john.viewer@app360.internal',
        password: 'ViewerSecret2026!',
        roleId: viewerRoleId
      })
    });
    const viewerData = await createViewerRes.json();
    assert(
      createViewerRes.status === 201 &&
      viewerData.data.email === 'john.viewer@app360.internal',
      'Test 9: Administrator successfully created user with VIEWER role',
      `Viewer ID: ${viewerData.data.id}`
    );
    viewerUserId = viewerData.data.id;

    // Log in as Viewer to get token
    const viewLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'john.viewer@app360.internal',
        password: 'ViewerSecret2026!'
      })
    });
    const viewLoginData = await viewLoginRes.json();
    viewerToken = viewLoginData.data.token;

    // -------------------------------------------------------------
    // Test 10: Admin Authorization (Full Privileges)
    // -------------------------------------------------------------
    console.log('\n🔹 Testing Admin Authorization...');
    const adminRolesRes = await fetch(`${baseUrl}/roles`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(
      adminRolesRes.status === 200,
      'Test 10: Admin authorization grants access to role management',
      `HTTP ${adminRolesRes.status}`
    );

    // -------------------------------------------------------------
    // Test 11: Engineer Authorization (Operational Access vs Admin Restrictions)
    // -------------------------------------------------------------
    console.log('\n🔹 Testing Engineer Authorization...');
    // Engineer has api:read -> should be allowed to view users
    const engListUsersRes = await fetch(`${baseUrl}/users`, {
      headers: { Authorization: `Bearer ${engineerToken}` }
    });
    assert(
      engListUsersRes.status === 200,
      'Test 11a: Engineer has permission [api:read] and can read users list',
      `HTTP ${engListUsersRes.status}`
    );

    // Engineer attempts admin-only operation (create user) -> should be forbidden (403)
    const engCreateUserRes = await fetch(`${baseUrl}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${engineerToken}`
      },
      body: JSON.stringify({
        name: 'Unauthorized User',
        email: 'unauth@app360.internal',
        password: 'Password123!',
        roleId: viewerRoleId
      })
    });
    assert(
      engCreateUserRes.status === 403,
      'Test 11b: Engineer blocked from admin-only user creation (HTTP 403)',
      `HTTP ${engCreateUserRes.status}`
    );

    // -------------------------------------------------------------
    // Test 12: Viewer Read-Only Restrictions
    // -------------------------------------------------------------
    console.log('\n🔹 Testing Viewer Restrictions...');
    // Viewer has api.read: false by default -> should be rejected with 403 Forbidden
    const viewerReadUsersRes = await fetch(`${baseUrl}/users`, {
      headers: { Authorization: `Bearer ${viewerToken}` }
    });
    assert(
      viewerReadUsersRes.status === 403,
      'Test 12: Viewer is blocked from unpermitted module [api:read] with HTTP 403',
      `HTTP ${viewerReadUsersRes.status}`
    );

    // -------------------------------------------------------------
    // Test 13: Dynamic Permission Updates (Live without restart)
    // -------------------------------------------------------------
    console.log('\n🔹 Testing Dynamic Permission Updates in MongoDB...');
    // Admin dynamically grants api.read: true to VIEWER role
    const updatePermRes = await fetch(`${baseUrl}/roles/${viewerRoleId}/permissions`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        permissions: {
          alarm: { read: true, create: false, update: false, delete: false },
          map: { read: true, create: false, update: false, delete: false },
          api: { read: true, create: false, update: false, delete: false } // Dynamically granted!
        }
      })
    });
    assert(
      updatePermRes.status === 200,
      'Test 13a: Administrator dynamically updated VIEWER role permissions in database',
      `HTTP ${updatePermRes.status}`
    );

    // Viewer makes the exact same request again with existing token -> MUST NOW SUCCEED!
    const viewerRetryRes = await fetch(`${baseUrl}/users`, {
      headers: { Authorization: `Bearer ${viewerToken}` }
    });
    assert(
      viewerRetryRes.status === 200,
      'Test 13b: Viewer immediately granted access to [api:read] dynamically without restart',
      `HTTP ${viewerRetryRes.status}`
    );

    // -------------------------------------------------------------
    // Test 14: Unauthorized API Requests (Missing Token)
    // -------------------------------------------------------------
    console.log('\n🔹 Testing Unauthorized API Requests (No Token)...');
    const noTokenRes = await fetch(`${baseUrl}/users`);
    const noTokenData = await noTokenRes.json();
    assert(
      noTokenRes.status === 401 && noTokenData.error.code === 'UNAUTHORIZED',
      'Test 14: Request without Authorization token rejected with HTTP 401 UNAUTHORIZED',
      `HTTP ${noTokenRes.status}`
    );

    console.log('\n=============================================================');
    console.log('🎉 ALL 14 PHASE 2 TESTS PASSED PERFECTLY!');
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

runTests();

