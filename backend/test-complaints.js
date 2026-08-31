/**
 * Automated Verification Suite for Complaint & Facility Management System
 * 
 * Verifies end-to-end:
 * 1. Student registers/logs in and creates a complaint (status: PENDING).
 * 2. Student views complaint list and single complaint by ID.
 * 3. Student updates complaint while status is PENDING (should succeed).
 * 4. Admin logs in and checks dashboard analytics (summary, byCategory, byPriority).
 * 5. Admin lists all complaints with pagination/filter.
 * 6. Admin assigns complaint to seeded staff user (status becomes ASSIGNED).
 * 7. Verification that assigning to a non-staff user returns 400 Bad Request.
 * 8. Student attempts to update complaint after assignment -> returns 409 Conflict.
 * 9. Staff logs in and retrieves assigned tasks.
 * 10. Staff updates task status to IN_PROGRESS.
 * 11. Staff attempts invalid transition (e.g. to PENDING) -> returns 400 Bad Request.
 * 12. Staff resolves task with resolutionNotes.
 * 13. Student checks complaint detail -> confirms RESOLVED status and full statusHistory timeline.
 * 14. Unauthorized checks: Student cannot view another student's complaint (403).
 */

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');

require('dotenv').config();

const User = require('./models/User');
const Complaint = require('./models/Complaint');
const authRoutes = require('./routes/auth');
const complaintRoutes = require('./routes/complaints');
const adminRoutes = require('./routes/admin');
const staffRoutes = require('./routes/staff');

const makeRequest = async (url, options = {}) => {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => null);
  return { status: res.status, headers: res.headers, body: data };
};

async function runComplaintTests() {
  console.log('====================================================================');
  console.log('    CampusCare Complaint & Facility Workflow Test Verification     ');
  console.log('====================================================================\n');

  let mongod = null;
  let mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/campuscare';

  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 1500 });
    console.log(`[Database] Connected to external MongoDB: ${mongoUri}`);
  } catch (err) {
    console.log(`[Database] Local/External MongoDB offline (${err.message}).`);
    console.log(`[Database] Using MongoMemoryServer for verification...`);
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongod = await MongoMemoryServer.create();
    mongoUri = mongod.getUri();
    await mongoose.connect(mongoUri);
    console.log(`[Database] Connected to MongoMemoryServer at: ${mongoUri}`);
  }

  // Setup Express server with all routes mounted
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/complaints', complaintRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/staff', staffRoutes);

  const testServer = http.createServer(app);
  const TEST_PORT = 5066;
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
    // Setup Users: Admin, Staff, Student 1, Student 2
    // -------------------------------------------------------------
    console.log('\n--- Step 1: User Setup & Authentication ---');
    const adminUser = await User.create({
      name: 'Admin Officer',
      email: 'admin.flow@campuscare.edu',
      password: 'AdminPassword123!',
      role: 'admin',
    });

    const staffUser = await User.create({
      name: 'Electrician Staff Mike',
      email: 'mike.staff@campuscare.edu',
      password: 'StaffPassword123!',
      role: 'staff',
    });

    // Register Student 1
    const student1Res = await makeRequest(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Aarav Patel',
        email: 'aarav@campuscare.edu',
        password: 'StudentPass123!',
        studentId: 'STU-2026-101',
        role: 'student',
      }),
    });
    const student1Token = student1Res.body.token;

    // Register Student 2
    const student2Res = await makeRequest(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Diya Sen',
        email: 'diya@campuscare.edu',
        password: 'StudentPass123!',
        studentId: 'STU-2026-102',
        role: 'student',
      }),
    });
    const student2Token = student2Res.body.token;

    // Login as Admin
    const adminLoginRes = await makeRequest(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin.flow@campuscare.edu',
        password: 'AdminPassword123!',
      }),
    });
    const adminToken = adminLoginRes.body.token;

    // Login as Staff
    const staffLoginRes = await makeRequest(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'mike.staff@campuscare.edu',
        password: 'StaffPassword123!',
      }),
    });
    const staffToken = staffLoginRes.body.token;

    assert(Boolean(student1Token && student2Token && adminToken && staffToken), 'All 4 role tokens acquired successfully');

    // -------------------------------------------------------------
    // Step 2: Student Creates Complaint
    // -------------------------------------------------------------
    console.log('\n--- Step 2: Student Creates Complaint ---');
    const complaintPayload = {
      title: 'Water leakage in Block B 3rd Floor Restroom',
      description: 'The main pipe under washbasin 2 is leaking continuously causing floor flooding.',
      category: 'Plumbing',
      location: 'Block B - 3rd Floor - Restroom 302',
      priority: 'HIGH',
    };

    const createRes = await makeRequest(`${BASE_URL}/api/complaints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${student1Token}`,
      },
      body: JSON.stringify(complaintPayload),
    });

    assert(createRes.status === 201, 'POST /api/complaints returns 201 Created', `Got ${createRes.status}`);
    const createdComplaint = createRes.body.complaint;
    assert(createdComplaint.status === 'PENDING', 'Initial status is PENDING');
    assert(createdComplaint.priority === 'HIGH', 'Priority set correctly to HIGH');
    assert(createdComplaint.category === 'Plumbing', 'Category set correctly to Plumbing');
    assert(Array.isArray(createdComplaint.statusHistory), 'statusHistory is an array');
    assert(createdComplaint.statusHistory.length === 1, 'statusHistory has 1 initial entry');
    assert(createdComplaint.statusHistory[0].status === 'PENDING', 'Initial history entry is PENDING');
    const complaintId = createdComplaint._id;

    // -------------------------------------------------------------
    // Step 3: Student Views Complaints List & Details
    // -------------------------------------------------------------
    console.log('\n--- Step 3: Student Views Complaints List & Details ---');
    const myComplaintsRes = await makeRequest(`${BASE_URL}/api/complaints`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${student1Token}` },
    });

    assert(myComplaintsRes.status === 200, 'GET /api/complaints returns 200 OK');
    assert(myComplaintsRes.body.count >= 1, 'Complaints list returns at least 1 complaint');
    assert(myComplaintsRes.body.complaints[0]._id === complaintId, 'Returned complaint matches created ID');

    // Filter test
    const filterRes = await makeRequest(`${BASE_URL}/api/complaints?category=Plumbing&status=PENDING`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    assert(filterRes.body.count >= 1, 'Filtering with ?category=Plumbing&status=PENDING returns matching results');

    // View detail by ID
    const detailRes = await makeRequest(`${BASE_URL}/api/complaints/${complaintId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    assert(detailRes.status === 200, 'GET /api/complaints/:id returns 200 OK');
    assert(detailRes.body.complaint.title === complaintPayload.title, 'Detail matches submitted title');

    // -------------------------------------------------------------
    // Step 4: Student Updates Complaint While PENDING
    // -------------------------------------------------------------
    console.log('\n--- Step 4: Student Updates Complaint While PENDING ---');
    const updatePendingRes = await makeRequest(`${BASE_URL}/api/complaints/${complaintId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${student1Token}`,
      },
      body: JSON.stringify({
        description: 'Updated: The main pipe under washbasin 2 and 3 are leaking.',
        priority: 'CRITICAL',
      }),
    });

    assert(updatePendingRes.status === 200, 'PUT /api/complaints/:id while PENDING returns 200 OK');
    assert(updatePendingRes.body.complaint.priority === 'CRITICAL', 'Updated priority is CRITICAL');

    // -------------------------------------------------------------
    // Step 5: Admin Dashboard Analytics
    // -------------------------------------------------------------
    console.log('\n--- Step 5: Admin Dashboard Analytics ---');
    const dashboardRes = await makeRequest(`${BASE_URL}/api/admin/dashboard`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert(dashboardRes.status === 200, 'GET /api/admin/dashboard returns 200 OK');
    const metrics = dashboardRes.body.data;
    assert(metrics.summary.total >= 1, 'Dashboard summary counts total complaints correctly');
    assert(metrics.summary.pending >= 1, 'Dashboard summary counts pending complaints correctly');
    assert(Array.isArray(metrics.byCategory), 'Dashboard includes byCategory breakdown array');
    assert(Array.isArray(metrics.byPriority), 'Dashboard includes byPriority breakdown array');
    assert(metrics.summary.totalStudents >= 2, 'Dashboard counts registered students');

    // -------------------------------------------------------------
    // Step 6: Admin Lists All Complaints
    // -------------------------------------------------------------
    console.log('\n--- Step 6: Admin Lists All Complaints ---');
    const adminComplaintsRes = await makeRequest(`${BASE_URL}/api/admin/complaints?page=1&limit=5`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert(adminComplaintsRes.status === 200, 'GET /api/admin/complaints returns 200 OK');
    assert(adminComplaintsRes.body.pagination.page === 1, 'Pagination page is 1');
    assert(adminComplaintsRes.body.complaints.length >= 1, 'Admin sees submitted complaints');

    // -------------------------------------------------------------
    // Step 7: Admin Assigns Staff to Complaint
    // -------------------------------------------------------------
    console.log('\n--- Step 7: Admin Assigns Staff ---');
    // Test invalid staff assignment (assigning student ID instead of staff)
    const invalidAssignRes = await makeRequest(`${BASE_URL}/api/admin/complaints/${complaintId}/assign`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ staffId: student1Res.body.user.id }),
    });
    assert(invalidAssignRes.status === 400, 'Assigning non-staff user returns 400 Bad Request');

    // Valid assignment to staffUser
    const assignRes = await makeRequest(`${BASE_URL}/api/admin/complaints/${complaintId}/assign`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ staffId: staffUser._id.toString() }),
    });

    assert(assignRes.status === 200, 'PUT /api/admin/complaints/:id/assign returns 200 OK');
    assert(assignRes.body.complaint.status === 'ASSIGNED', 'Complaint status updated to ASSIGNED');
    assert(assignRes.body.complaint.assignedTo._id === staffUser._id.toString(), 'assignedTo populated with staff');
    assert(assignRes.body.complaint.statusHistory.length === 2, 'statusHistory now contains 2 entries');

    // -------------------------------------------------------------
    // Step 8: Student Cannot Edit Complaint Once ASSIGNED (409 Conflict)
    // -------------------------------------------------------------
    console.log('\n--- Step 8: Edit Restriction Once Non-Pending ---');
    const blockedEditRes = await makeRequest(`${BASE_URL}/api/complaints/${complaintId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${student1Token}`,
      },
      body: JSON.stringify({ title: 'Trying to edit after assignment' }),
    });

    assert(blockedEditRes.status === 409, 'Student editing assigned complaint returns 409 Conflict', `Got ${blockedEditRes.status}`);

    // -------------------------------------------------------------
    // Step 9: Staff Views Tasks & Updates Status
    // -------------------------------------------------------------
    console.log('\n--- Step 9: Staff Views Tasks & Updates Status ---');
    const staffTasksRes = await makeRequest(`${BASE_URL}/api/staff/tasks`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${staffToken}` },
    });

    assert(staffTasksRes.status === 200, 'GET /api/staff/tasks returns 200 OK');
    assert(staffTasksRes.body.count === 1, 'Staff sees 1 assigned task');
    assert(staffTasksRes.body.tasks[0]._id === complaintId, 'Task matches assigned complaint ID');

    // Staff attempts invalid transition to PENDING (should be rejected)
    const staffInvalidStatusRes = await makeRequest(`${BASE_URL}/api/staff/tasks/${complaintId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({ status: 'PENDING' }),
    });
    assert(staffInvalidStatusRes.status === 400, 'Staff setting status to PENDING rejected with 400');

    // Staff sets status to IN_PROGRESS
    const staffProgressRes = await makeRequest(`${BASE_URL}/api/staff/tasks/${complaintId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        status: 'IN_PROGRESS',
        notes: 'Arrived at Block B, replacing faulty washer and connector pipe.',
      }),
    });

    assert(staffProgressRes.status === 200, 'PUT /api/staff/tasks/:id/status to IN_PROGRESS returns 200 OK');
    assert(staffProgressRes.body.task.status === 'IN_PROGRESS', 'Task status is now IN_PROGRESS');
    assert(staffProgressRes.body.task.statusHistory.length === 3, 'statusHistory now contains 3 entries');

    // -------------------------------------------------------------
    // Step 10: Staff Resolves Task
    // -------------------------------------------------------------
    console.log('\n--- Step 10: Staff Resolves Task ---');
    const resolveRes = await makeRequest(`${BASE_URL}/api/staff/tasks/${complaintId}/resolve`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        resolutionNotes: 'Replaced washbasin 2 PVC drain line and sealed faucet joint. Water pressure normal and dry.',
      }),
    });

    assert(resolveRes.status === 200, 'PUT /api/staff/tasks/:id/resolve returns 200 OK');
    assert(resolveRes.body.task.status === 'RESOLVED', 'Task status is now RESOLVED');
    assert(resolveRes.body.task.resolutionNotes.includes('Replaced washbasin'), 'resolutionNotes stored properly');
    assert(resolveRes.body.task.statusHistory.length === 4, 'statusHistory contains 4 entries');

    // -------------------------------------------------------------
    // Step 11: Student Verifies Full Timeline
    // -------------------------------------------------------------
    console.log('\n--- Step 11: Student Verifies Full Timeline ---');
    const finalDetailRes = await makeRequest(`${BASE_URL}/api/complaints/${complaintId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${student1Token}` },
    });

    assert(finalDetailRes.status === 200, 'Student reads resolved complaint');
    const finalComplaint = finalDetailRes.body.complaint;
    assert(finalComplaint.status === 'RESOLVED', 'Complaint status is RESOLVED');
    assert(Boolean(finalComplaint.resolutionNotes), 'Resolution notes visible to student');

    const timeline = finalComplaint.statusHistory.map((h) => h.status);
    console.log(`    Timeline progression: ${timeline.join(' -> ')}`);
    assert(
      timeline[0] === 'PENDING' &&
      timeline[1] === 'ASSIGNED' &&
      timeline[2] === 'IN_PROGRESS' &&
      timeline[3] === 'RESOLVED',
      'Timeline accurately records PENDING -> ASSIGNED -> IN_PROGRESS -> RESOLVED'
    );

    // -------------------------------------------------------------
    // Step 12: Ownership & Security Checks
    // -------------------------------------------------------------
    console.log('\n--- Step 12: Ownership & Security Checks ---');
    // Student 2 attempts to read Student 1's complaint
    const forbiddenStudentRes = await makeRequest(`${BASE_URL}/api/complaints/${complaintId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${student2Token}` },
    });
    assert(forbiddenStudentRes.status === 403, 'Student 2 denied access (403 Forbidden) to Student 1 complaint');

    // Student attempts to access admin dashboard
    const forbiddenAdminRes = await makeRequest(`${BASE_URL}/api/admin/dashboard`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    assert(forbiddenAdminRes.status === 403, 'Student denied access (403 Forbidden) to admin dashboard');

    // Student attempts to access staff tasks
    const forbiddenStaffRes = await makeRequest(`${BASE_URL}/api/staff/tasks`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    assert(forbiddenStaffRes.status === 403, 'Student denied access (403 Forbidden) to staff tasks');

  } catch (testError) {
    console.error(`[Test Suite Error] ${testError.message}`, testError.stack);
  } finally {
    await new Promise((resolve) => testServer.close(resolve));
    await mongoose.disconnect();
    if (mongod) {
      await mongod.stop();
    }

    console.log('\n====================================================================');
    console.log(` Results: ${passedTests} / ${totalTests} tests passed (${Math.round((passedTests / totalTests) * 100)}%)`);
    console.log('====================================================================\n');

    if (passedTests === totalTests) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  }
}

runComplaintTests();
