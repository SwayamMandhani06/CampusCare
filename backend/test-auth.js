/**
 * Automated Verification Script for CampusCare Authentication & Backend Scaffold
 * 
 * This test suite:
 * 1. Uses either the configured MongoDB URI or spins up an in-memory Mongo server if offline.
 * 2. Runs the seeding process (Admin & Staff accounts).
 * 3. Registers a Student account via POST /api/auth/register.
 * 4. Logs in as that Student via POST /api/auth/login.
 * 5. Logs in as the Seeded Admin via POST /api/auth/login.
 * 6. Logs in as the Seeded Staff via POST /api/auth/login.
 * 7. Calls protected GET /api/auth/me for Student, Admin, and Staff, verifying role-based info.
 * 8. Verifies 401 Unauthorized behavior on invalid password or missing token.
 * 9. Tests role authorization middleware with authorize() check.
 */

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');

// Load environment variables
require('dotenv').config();

const User = require('./models/User');
const authRoutes = require('./routes/auth');
const { protect, authorize } = require('./middleware/auth');

// Simple fetch wrapper using native http or fetch (Node 18+)
const makeRequest = async (url, options = {}) => {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => null);
  return { status: res.status, headers: res.headers, body: data };
};

async function runTests() {
  console.log('===============================================================');
  console.log('    CampusCare Authentication & Scaffold Test Verification     ');
  console.log('===============================================================\n');

  let mongod = null;
  let mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/campuscare';

  // Test if local MongoDB is responsive
  let connected = false;
  try {
    const testConn = await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 });
    connected = true;
    console.log(`[Database] Connected to external MongoDB: ${mongoUri}`);
  } catch (err) {
    console.log(`[Database] Local/External MongoDB not accessible (${err.message}).`);
    console.log(`[Database] Starting embedded MongoMemoryServer for verification...`);
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongod = await MongoMemoryServer.create();
    mongoUri = mongod.getUri();
    await mongoose.connect(mongoUri);
    console.log(`[Database] Connected to MongoMemoryServer at: ${mongoUri}`);
  }

  // Setup Express App
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/auth', authRoutes);

  // Test route for role authorization
  app.get('/api/test/admin-only', protect, authorize('admin'), (req, res) => {
    res.json({ success: true, message: 'Welcome Admin!', user: req.user });
  });

  const testServer = http.createServer(app);
  const TEST_PORT = 5055;
  await new Promise((resolve) => testServer.listen(TEST_PORT, resolve));
  const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName, details = '') {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] Test ${totalTests}: ${testName}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] Test ${totalTests}: ${testName} - ${details}`);
    }
  }

  try {
    // -------------------------------------------------------------
    // Test 1: Seed privileged accounts (Admin and Staff)
    // -------------------------------------------------------------
    console.log('\n--- Step 1: Seeding Admin & Staff ---');
    const adminUser = await User.create({
      name: 'Campus Administrator',
      email: 'admin@campuscare.edu',
      password: 'AdminPassword123!',
      role: 'admin',
    });
    const staffUser = await User.create({
      name: 'Maintenance Staff Lead',
      email: 'staff@campuscare.edu',
      password: 'StaffPassword123!',
      role: 'staff',
    });

    assert(adminUser && adminUser.role === 'admin', 'Admin account seeded with role "admin"');
    assert(staffUser && staffUser.role === 'staff', 'Staff account seeded with role "staff"');

    // -------------------------------------------------------------
    // Test 2: Register a student
    // -------------------------------------------------------------
    console.log('\n--- Step 2: Student Registration ---');
    const studentRegPayload = {
      name: 'Rahul Sharma',
      email: 'rahul.s@campuscare.edu',
      password: 'StudentPass#2026',
      studentId: 'STU-2026-0042',
      role: 'student',
    };

    const regRes = await makeRequest(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(studentRegPayload),
    });

    assert(regRes.status === 201, 'POST /api/auth/register returns 201 Created', `Got ${regRes.status}`);
    assert(regRes.body.success === true, 'Response contains success: true');
    assert(typeof regRes.body.token === 'string', 'Response contains JWT token string');
    assert(regRes.body.user.role === 'student', 'Registered user has role "student"');
    assert(regRes.body.user.studentId === 'STU-2026-0042', 'Registered user has studentId attached');
    assert(!regRes.body.user.password, 'User password is not leaked in response');

    // -------------------------------------------------------------
    // Test 3: Student Login
    // -------------------------------------------------------------
    console.log('\n--- Step 3: Student Login ---');
    const studentLoginRes = await makeRequest(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'rahul.s@campuscare.edu',
        password: 'StudentPass#2026',
      }),
    });

    assert(studentLoginRes.status === 200, 'POST /api/auth/login returns 200 OK');
    assert(typeof studentLoginRes.body.token === 'string', 'Login returns valid JWT token');
    const studentToken = studentLoginRes.body.token;

    // -------------------------------------------------------------
    // Test 4: Seeded Admin Login
    // -------------------------------------------------------------
    console.log('\n--- Step 4: Seeded Admin Login ---');
    const adminLoginRes = await makeRequest(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@campuscare.edu',
        password: 'AdminPassword123!',
      }),
    });

    assert(adminLoginRes.status === 200, 'Admin login returns 200 OK');
    assert(adminLoginRes.body.user.role === 'admin', 'Admin login user object has role "admin"');
    const adminToken = adminLoginRes.body.token;

    // -------------------------------------------------------------
    // Test 5: Seeded Staff Login
    // -------------------------------------------------------------
    console.log('\n--- Step 5: Seeded Staff Login ---');
    const staffLoginRes = await makeRequest(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'staff@campuscare.edu',
        password: 'StaffPassword123!',
      }),
    });

    assert(staffLoginRes.status === 200, 'Staff login returns 200 OK');
    assert(staffLoginRes.body.user.role === 'staff', 'Staff login user object has role "staff"');
    const staffToken = staffLoginRes.body.token;

    // -------------------------------------------------------------
    // Test 6: Protected GET /api/auth/me for Student
    // -------------------------------------------------------------
    console.log('\n--- Step 6: Verify GET /api/auth/me for Student ---');
    const studentMeRes = await makeRequest(`${BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    assert(studentMeRes.status === 200, 'GET /api/auth/me with Student token returns 200 OK');
    assert(studentMeRes.body.user.role === 'student', 'Student profile returns role: student');
    assert(studentMeRes.body.user.email === 'rahul.s@campuscare.edu', 'Student profile matches email');
    assert(!studentMeRes.body.user.password, 'Student profile excludes password field');

    // -------------------------------------------------------------
    // Test 7: Protected GET /api/auth/me for Admin
    // -------------------------------------------------------------
    console.log('\n--- Step 7: Verify GET /api/auth/me for Admin ---');
    const adminMeRes = await makeRequest(`${BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert(adminMeRes.status === 200, 'GET /api/auth/me with Admin token returns 200 OK');
    assert(adminMeRes.body.user.role === 'admin', 'Admin profile returns role: admin');
    assert(adminMeRes.body.user.email === 'admin@campuscare.edu', 'Admin profile matches email');

    // -------------------------------------------------------------
    // Test 8: Protected GET /api/auth/me for Staff
    // -------------------------------------------------------------
    console.log('\n--- Step 8: Verify GET /api/auth/me for Staff ---');
    const staffMeRes = await makeRequest(`${BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${staffToken}` },
    });

    assert(staffMeRes.status === 200, 'GET /api/auth/me with Staff token returns 200 OK');
    assert(staffMeRes.body.user.role === 'staff', 'Staff profile returns role: staff');

    // -------------------------------------------------------------
    // Test 9: Negative Authentication Tests
    // -------------------------------------------------------------
    console.log('\n--- Step 9: Negative Authentication Tests ---');
    // Wrong password login
    const wrongPassRes = await makeRequest(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@campuscare.edu',
        password: 'WrongPassword!',
      }),
    });
    assert(wrongPassRes.status === 401, 'Login with incorrect password returns 401 Unauthorized');

    // Missing token on protected endpoint
    const noTokenRes = await makeRequest(`${BASE_URL}/api/auth/me`, {
      method: 'GET',
    });
    assert(noTokenRes.status === 401, 'Accessing protected route without token returns 401');

    // Invalid token
    const badTokenRes = await makeRequest(`${BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: { Authorization: 'Bearer invalid.jwt.token' },
    });
    assert(badTokenRes.status === 401, 'Accessing protected route with forged token returns 401');

    // -------------------------------------------------------------
    // Test 10: Role-Based Authorization (authorize middleware)
    // -------------------------------------------------------------
    console.log('\n--- Step 10: Role-Based Authorization Tests ---');
    // Student tries to access admin-only route -> expect 403
    const studentForbiddenRes = await makeRequest(`${BASE_URL}/api/test/admin-only`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(studentForbiddenRes.status === 403, 'Student denied access (403 Forbidden) on admin-only route');

    // Admin accesses admin-only route -> expect 200
    const adminAllowedRes = await makeRequest(`${BASE_URL}/api/test/admin-only`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminAllowedRes.status === 200, 'Admin granted access (200 OK) on admin-only route');

  } catch (testError) {
    console.error(`[Test Suite Error] ${testError.message}`, testError.stack);
  } finally {
    // Cleanup
    await new Promise((resolve) => testServer.close(resolve));
    await mongoose.disconnect();
    if (mongod) {
      await mongod.stop();
    }

    console.log('\n===============================================================');
    console.log(` Results: ${passedTests} / ${totalTests} tests passed (${Math.round((passedTests / totalTests) * 100)}%)`);
    console.log('===============================================================\n');

    if (passedTests === totalTests) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  }
}

runTests();
