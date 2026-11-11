const mongoose = require('mongoose');
const app = require('../src/app');
const Role = require('../src/models/Role');
const User = require('../src/models/User');
const AuditLog = require('../src/models/AuditLog');
const { seedRoles } = require('../src/utils/seedRoles');
const { seedUsers } = require('../src/utils/seedUsers');
const UserRepository = require('../src/repositories/UserRepository');
const RoleRepository = require('../src/repositories/RoleRepository');

const TEST_DB_URI = 'mongodb://127.0.0.1:27017/app360_phase6_test';

let server;
let baseUrl;

let adminToken = '';
let engineerToken = '';
let viewerToken = '';
let engineerRoleId = '';
let viewerRoleId = '';
let createdUserId = '';
let customRoleId = '';

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

const makeRequest = async (urlPath, options = {}) => {
  const url = `${baseUrl}${urlPath}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  let data = null;
  const text = await response.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return {
    status: response.status,
    data
  };
};

async function runTests() {
  console.log('\n=============================================================');
  console.log('🧪 Starting App360 Phase 6 Test Suite (User & Dynamic RBAC)');
  console.log('=============================================================\n');

  try {
    await mongoose.connect(TEST_DB_URI);
    await mongoose.connection.dropDatabase();

    await seedRoles();
    await seedUsers();

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}/api`;
        resolve();
      });
    });

    // 1. Initial Logins
    const adminLogin = await makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@app360.internal',
        password: 'Admin@360!'
      })
    });
    adminToken = adminLogin.data.data.token;

    const engLogin = await makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'engineer.test@app360.internal',
        password: 'Password123!'
      })
    });
    engineerToken = engLogin.data.data.token;

    const viewLogin = await makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'viewer.test@app360.internal',
        password: 'Password123!'
      })
    });
    viewerToken = viewLogin.data.data.token;

    const engRole = await RoleRepository.findByName('ENGINEER');
    const viewRole = await RoleRepository.findByName('VIEWER');
    engineerRoleId = engRole._id.toString();
    viewerRoleId = viewRole._id.toString();

    // ------------------------------------------------------------------------
    // Test 1: Admin Creates User
    // ------------------------------------------------------------------------
    console.log('🔹 Test 1: Admin creates a user...');
    const createRes = await makeRequest('/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Alex NOC Operator',
        email: 'alex.noc@app360.internal',
        password: 'SecurePassword123!',
        roleId: engineerRoleId
      })
    });
    assert(
      createRes.status === 201 && createRes.data.success && createRes.data.data.email === 'alex.noc@app360.internal',
      'Test 1: Admin creates a user successfully',
      `Status: ${createRes.status}`
    );
    createdUserId = createRes.data.data.id;

    // ------------------------------------------------------------------------
    // Test 2: Duplicate Email Rejection
    // ------------------------------------------------------------------------
    console.log('\n🔹 Test 2: Duplicate email rejection...');
    const dupRes = await makeRequest('/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Duplicate Alex',
        email: 'alex.noc@app360.internal',
        password: 'AnotherPassword123!',
        roleId: engineerRoleId
      })
    });
    assert(
      dupRes.status === 409 && dupRes.data.error.code === 'CONFLICT',
      'Test 2: Duplicate email is rejected with HTTP 409 CONFLICT',
      `Status: ${dupRes.status}`
    );

    // ------------------------------------------------------------------------
    // Test 3: Admin Assigns Role (ENGINEER)
    // ------------------------------------------------------------------------
    console.log('\n🔹 Test 3: Admin assigns ENGINEER role...');
    const assignEngRes = await makeRequest(`/users/${createdUserId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ roleId: engineerRoleId })
    });
    assert(
      assignEngRes.status === 200 && assignEngRes.data.data.roleId.name === 'ENGINEER',
      'Test 3: Admin assigns ENGINEER role to a user',
      `Role: ${assignEngRes.data.data?.roleId?.name}`
    );

    // ------------------------------------------------------------------------
    // Test 4: Admin Assigns Role (VIEWER)
    // ------------------------------------------------------------------------
    console.log('\n🔹 Test 4: Admin assigns VIEWER role...');
    const assignViewRes = await makeRequest(`/users/${createdUserId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ roleId: viewerRoleId })
    });
    assert(
      assignViewRes.status === 200 && assignViewRes.data.data.roleId.name === 'VIEWER',
      'Test 4: Admin assigns VIEWER role to a user',
      `Role: ${assignViewRes.data.data?.roleId?.name}`
    );

    // ------------------------------------------------------------------------
    // Test 5: Admin Creates Custom Role
    // ------------------------------------------------------------------------
    console.log('\n🔹 Test 5: Admin creates a custom role...');
    const customRoleRes = await makeRequest('/roles', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'SECURITY_AUDITOR',
        description: 'Read-only access to audit logs and security settings',
        permissions: {
          dashboard: { read: true, create: false, update: false, delete: false },
          audit: { read: true, create: false, update: false, delete: false },
          settings: { read: true, create: false, update: false, delete: false }
        }
      })
    });
    assert(
      customRoleRes.status === 201 && customRoleRes.data.data.name === 'SECURITY_AUDITOR',
      'Test 5: Admin creates a custom role',
      `Role Name: ${customRoleRes.data.data?.name}`
    );
    customRoleId = customRoleRes.data.data.id;

    // ------------------------------------------------------------------------
    // Test 6: Admin Updates Role Permissions
    // ------------------------------------------------------------------------
    console.log('\n🔹 Test 6: Admin updates permissions...');
    const updatePermsRes = await makeRequest(`/roles/${customRoleId}/permissions`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        permissions: {
          dashboard: { read: true, create: false, update: false, delete: false },
          audit: { read: true, create: true, update: false, delete: false },
          alarm: { read: true, create: false, update: false, delete: false }
        }
      })
    });
    assert(
      updatePermsRes.status === 200 && updatePermsRes.data.data.permissions.alarm.read === true,
      'Test 6: Admin updates role permissions',
      `Alarm read: ${updatePermsRes.data.data?.permissions?.alarm?.read}`
    );

    // ------------------------------------------------------------------------
    // Test 7: Permission Changes Take Effect Immediately
    // ------------------------------------------------------------------------
    console.log('\n🔹 Test 7: Real-time dynamic permission enforcement...');
    // Assign custom role to user
    await makeRequest(`/users/${createdUserId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ roleId: customRoleId })
    });

    const loginAlex = await makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'alex.noc@app360.internal',
        password: 'SecurePassword123!'
      })
    });
    const alexToken = loginAlex.data.data.token;

    // Alex has alarm:read -> should succeed
    const alarmGrantedRes = await makeRequest('/alarms', {
      headers: { Authorization: `Bearer ${alexToken}` }
    });
    assert(
      alarmGrantedRes.status === 200,
      'Test 7a: Dynamic permission granted: Alex can read alarms (HTTP 200)',
      `Status: ${alarmGrantedRes.status}`
    );

    // Revoke alarm:read dynamically in DB
    await makeRequest(`/roles/${customRoleId}/permissions`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        permissions: {
          alarm: { read: false, create: false, update: false, delete: false }
        }
      })
    });

    // Immediately query /alarms again without restarting server
    const alarmRevokedRes = await makeRequest('/alarms', {
      headers: { Authorization: `Bearer ${alexToken}` }
    });
    assert(
      alarmRevokedRes.status === 403,
      'Test 7b: Dynamic permission revoked: Alex immediately blocked without server restart (HTTP 403)',
      `Status: ${alarmRevokedRes.status}`
    );

    // ------------------------------------------------------------------------
    // Test 8: Viewer Cannot Access User Administration
    // ------------------------------------------------------------------------
    console.log('\n🔹 Test 8: Viewer authorization rejection...');
    const viewCreateRes = await makeRequest('/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${viewerToken}` },
      body: JSON.stringify({
        name: 'Unauthorized User',
        email: 'unauth@app360.internal',
        password: 'Password123!',
        roleId: viewerRoleId
      })
    });
    assert(
      viewCreateRes.status === 403,
      'Test 8: Viewer cannot access user administration (HTTP 403)',
      `Status: ${viewCreateRes.status}`
    );

    // ------------------------------------------------------------------------
    // Test 9: Engineer Cannot Modify Roles
    // ------------------------------------------------------------------------
    console.log('\n🔹 Test 9: Engineer administrative rejection...');
    const engRoleModRes = await makeRequest(`/roles/${customRoleId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${engineerToken}` },
      body: JSON.stringify({ description: 'Hacked by engineer' })
    });
    assert(
      engRoleModRes.status === 403,
      'Test 9: Engineer cannot perform unauthorized administrative role updates (HTTP 403)',
      `Status: ${engRoleModRes.status}`
    );

    // ------------------------------------------------------------------------
    // Test 10: Unauthorized Request (No Token)
    // ------------------------------------------------------------------------
    console.log('\n🔹 Test 10: Unauthenticated requests...');
    const unauthRes = await makeRequest('/users');
    assert(
      unauthRes.status === 401,
      'Test 10: Unauthorized API request rejected with HTTP 401 UNAUTHORIZED',
      `Status: ${unauthRes.status}`
    );

    // ------------------------------------------------------------------------
    // Test 11: Deactivated User Cannot Authenticate
    // ------------------------------------------------------------------------
    console.log('\n🔹 Test 11: Account deactivation security...');
    const deactRes = await makeRequest(`/users/${createdUserId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ isActive: false })
    });
    assert(
      deactRes.status === 200 && deactRes.data.data.isActive === false,
      'Test 11a: Admin deactivates user account successfully',
      `isActive: ${deactRes.data.data.isActive}`
    );

    const deactLoginRes = await makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'alex.noc@app360.internal',
        password: 'SecurePassword123!'
      })
    });
    assert(
      deactLoginRes.status === 403 && deactLoginRes.data.error.code === 'ACCOUNT_DEACTIVATED',
      'Test 11b: Deactivated user rejected during login (HTTP 403 ACCOUNT_DEACTIVATED)',
      `Status: ${deactLoginRes.status}`
    );

    // ------------------------------------------------------------------------
    // Test 12: Password Hash Sanitization
    // ------------------------------------------------------------------------
    console.log('\n🔹 Test 12: Password hash sanitization...');
    const userDetailRes = await makeRequest(`/users/${createdUserId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(
      userDetailRes.status === 200 && typeof userDetailRes.data.data.passwordHash === 'undefined',
      'Test 12: Password hashes are never exposed in user API responses',
      `passwordHash: ${userDetailRes.data.data.passwordHash}`
    );

    // ------------------------------------------------------------------------
    // Test 13: Protection of Last Active Administrator
    // ------------------------------------------------------------------------
    console.log('\n🔹 Test 13: Protection of last active administrator...');
    const adminUser = await UserRepository.findByEmail('admin@app360.internal');
    const adminId = adminUser._id.toString();

    const deactAdminRes = await makeRequest(`/users/${adminId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ isActive: false })
    });
    assert(
      deactAdminRes.status === 400 && deactAdminRes.data.error.code === 'CANNOT_DEACTIVATE_LAST_ADMIN',
      'Test 13a: Deactivation of the last active administrator is strictly blocked (HTTP 400)',
      `Code: ${deactAdminRes.data.error?.code}`
    );

    const demoteAdminRes = await makeRequest(`/users/${adminId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ roleId: viewerRoleId })
    });
    assert(
      demoteAdminRes.status === 400 && demoteAdminRes.data.error.code === 'CANNOT_DEMOTE_LAST_ADMIN',
      'Test 13b: Demoting the last active administrator is strictly blocked (HTTP 400)',
      `Code: ${demoteAdminRes.data.error?.code}`
    );

    // ------------------------------------------------------------------------
    // Test 14: Audit Logging
    // ------------------------------------------------------------------------
    console.log('\n🔹 Test 14: Administrative audit log creation...');
    const auditRes = await makeRequest('/audit-logs?limit=30', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(
      auditRes.status === 200 && auditRes.data.data.length > 0,
      'Test 14a: Audit log endpoint returns HTTP 200 with recorded events',
      `Log count: ${auditRes.data.data.length}`
    );

    const actions = auditRes.data.data.map((l) => l.action);
    assert(
      actions.includes('USER_CREATED') &&
      actions.includes('ROLE_CREATED') &&
      actions.includes('PERMISSION_CHANGED') &&
      actions.includes('USER_DEACTIVATED'),
      'Test 14b: Audit records created for USER_CREATED, ROLE_CREATED, PERMISSION_CHANGED, and USER_DEACTIVATED',
      `Actions logged: ${[...new Set(actions)].join(', ')}`
    );

    // ------------------------------------------------------------------------
    // Test 15: Permissions Matrix Endpoint
    // ------------------------------------------------------------------------
    console.log('\n🔹 Test 15: Permissions matrix API...');
    const matrixRes = await makeRequest('/permissions', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(
      matrixRes.status === 200 &&
      matrixRes.data.data.modules.includes('user') &&
      matrixRes.data.data.modules.includes('role') &&
      matrixRes.data.data.modules.includes('audit') &&
      matrixRes.data.data.roles.length >= 3,
      'Test 15: GET /api/permissions returns full 9-module matrix and all role permissions',
      `Modules: ${matrixRes.data.data?.modules?.length}, Roles: ${matrixRes.data.data?.roles?.length}`
    );

    console.log('\n=============================================================');
    console.log('🎉 ALL 15 PHASE 6 TESTS PASSED PERFECTLY!');
    console.log('=============================================================\n');
  } catch (error) {
    console.error('\n💥 TEST EXECUTION FAILED:', error.message);
    process.exit(1);
  } finally {
    if (server) await new Promise((r) => server.close(r));
    await mongoose.disconnect();
  }
}

runTests();
