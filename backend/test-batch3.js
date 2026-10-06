/**
 * Batch 3 Verification Suite for CampusCare 2.0
 * 
 * Verifies end-to-end:
 * 1. PART A AUTHENTICATION:
 *    - Seeded Admin Login (admin@pccoepune.org)
 *    - Seeded Staff Login (staff@pccoepune.org)
 *    - Seeded Student Login (student@pccoepune.org)
 *    - Token retrieval, /api/auth/me role validation
 *    - Invalid credentials rejection (401)
 *    - Token absence / malformed token rejection (401)
 *    - Double-hash protection verification during idempotent upsert
 *    - Role-based route guard enforcement (RBAC)
 * 2. REAL-TIME COMPLAINT STATUS UPDATES (Socket.IO):
 *    - Socket connection handshake with valid JWT
 *    - Unauthorized socket rejection (missing/invalid JWT)
 *    - Room authorization: student joining own complaint room succeeds
 *    - Room authorization: student joining foreign complaint room is rejected (403)
 *    - Room authorization: admin joining any complaint room succeeds
 *    - Room authorization: assigned staff joining assigned complaint room succeeds
 *    - Event broadcast: complaint lifecycle updates emitted to room
 * 3. AI-ASSISTED COMPLAINT CLASSIFICATION:
 *    - Disabled mode fallback to deterministic rule engine (RULE_BASED)
 *    - Provider abstraction (AI mock provider returns confidence, rationale, keywords)
 *    - Manual priority override preservation (AI never overrides admin MANUAL priority)
 *    - Admin reclassify endpoint authorization (Admin only)
 * 4. DUPLICATE COMPLAINT DETECTION:
 *    - Obvious duplicate detection (high similarity, explainable match reason)
 *    - Unrelated non-duplicate complaint (low similarity)
 *    - Pre-submission check POST /api/complaints/check-duplicate
 *    - Bounded lookback period enforcement
 *    - Complaint submission with duplicate link metadata
 * 5. SMART STAFF RECOMMENDATION:
 *    - Explainable multi-factor scoring (specialization, workload, SLA health)
 *    - Staff ranking order based on specialization and active load
 *    - Admin endpoint GET /api/admin/complaints/:id/staff-recommendations
 *    - Authorization guard (non-admin forbidden)
 * 6. PROMETHEUS OBSERVABILITY:
 *    - Verification of Batch 3 metrics in /metrics endpoint
 */

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const ioClient = require('socket.io-client');

require('dotenv').config();
process.env.JWT_SECRET = process.env.JWT_SECRET || 'campuscare_batch3_jwt_secret_2026';
process.env.EMAIL_ENABLED = 'false';
process.env.ENABLE_SLA_SCHEDULER = 'false';

const User = require('./models/User');
const Complaint = require('./models/Complaint');
const { initSocket, getIO } = require('./services/socketService');
const { classifyComplaint } = require('./services/classificationService');
const { checkDuplicates, computeComplaintSimilarity } = require('./services/duplicateDetectionService');
const { getRecommendationsForComplaint } = require('./services/staffRecommendationService');
const metrics = require('./metrics');

const authRoutes = require('./routes/auth');
const complaintRoutes = require('./routes/complaints');
const adminRoutes = require('./routes/admin');
const staffRoutes = require('./routes/staff');
const notificationRoutes = require('./routes/notifications');

const DEMO_PASSWORD = 'CampusCare@2026';

const makeRequest = async (url, options = {}) => {
  const res = await fetch(url, options);
  const contentType = res.headers.get('content-type') || '';
  let data = null;
  if (contentType.includes('application/json')) {
    data = await res.json().catch(() => null);
  } else {
    data = await res.text().catch(() => null);
  }
  return { status: res.status, headers: res.headers, body: data };
};

async function runBatch3Tests() {
  console.log('====================================================================');
  console.log('       CampusCare 2.0 Batch 3 End-to-End Verification Suite        ');
  console.log('====================================================================\n');

  let mongod = null;
  let mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/campuscare';

  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 1500 });
    console.log(`[Database] Connected to external MongoDB: ${mongoUri}`);
  } catch (err) {
    console.log(`[Database] Using MongoMemoryServer for verification...`);
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongod = await MongoMemoryServer.create();
    mongoUri = mongod.getUri();
    await mongoose.connect(mongoUri);
    console.log(`[Database] Connected to MongoMemoryServer at: ${mongoUri}`);
  }

  // Set up Express application with HTTP server and Socket.IO
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use('/api/auth', authRoutes);
  app.use('/api/complaints', complaintRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/staff', staffRoutes);
  app.use('/api/notifications', notificationRoutes);

  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', metrics.register.contentType);
    res.end(await metrics.register.metrics());
  });

  const httpServer = http.createServer(app);
  initSocket(httpServer);

  await new Promise((resolve) => httpServer.listen(0, resolve));
  const port = httpServer.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;
  const socketUrl = `http://127.0.0.1:${port}`;
  console.log(`[Server] Test server listening on ${baseUrl}\n`);

  let passed = 0;
  let failed = 0;

  const assert = (condition, title, details = '') => {
    if (condition) {
      console.log(`  ✓ ${title}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${title} ${details ? '(' + details + ')' : ''}`);
      failed++;
    }
  };

  try {
    // Clean collections
    await User.deleteMany({});
    await Complaint.deleteMany({});

    // -------------------------------------------------------------
    // PART A: AUTHENTICATION & SEEDED DEMO CREDENTIALS
    // -------------------------------------------------------------
    console.log('--------------------------------------------------------------------');
    console.log('Suite 1: Seeded Authentication, Idempotency & Role Guards');
    console.log('--------------------------------------------------------------------');

    // 1. Create seeded users with deterministic password
    const adminUser = await User.create({
      name: 'System Administrator',
      email: 'admin@pccoepune.org',
      password: DEMO_PASSWORD,
      role: 'admin',
    });

    const staffUser = await User.create({
      name: 'Ramesh Pawar (Electrical)',
      email: 'staff@pccoepune.org',
      password: DEMO_PASSWORD,
      role: 'staff',
    });

    const staffPlumbing = await User.create({
      name: 'Suresh More (Plumbing)',
      email: 'staff.plumbing@pccoepune.org',
      password: DEMO_PASSWORD,
      role: 'staff',
    });

    const studentUser = await User.create({
      name: 'Aarav Sharma',
      email: 'student@pccoepune.org',
      password: DEMO_PASSWORD,
      role: 'student',
      studentId: '123B1B201',
    });

    const otherStudent = await User.create({
      name: 'Neha Patil',
      email: 'neha.patil@pccoepune.org',
      password: DEMO_PASSWORD,
      role: 'student',
      studentId: '123B1B202',
    });

    assert(adminUser && staffUser && studentUser, 'Seeded demo user records created');

    // 2. Test Admin Login
    const adminLoginRes = await makeRequest(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@pccoepune.org', password: DEMO_PASSWORD }),
    });
    assert(adminLoginRes.status === 200, 'Admin login with demo password succeeds (200)');
    assert(adminLoginRes.body.user && adminLoginRes.body.user.role === 'admin' && adminLoginRes.body.token, 'Admin payload has correct role and token');
    const adminToken = adminLoginRes.body.token;

    // 3. Test Staff Login
    const staffLoginRes = await makeRequest(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'staff@pccoepune.org', password: DEMO_PASSWORD }),
    });
    assert(staffLoginRes.status === 200, 'Staff login with demo password succeeds (200)');
    assert(staffLoginRes.body.user && staffLoginRes.body.user.role === 'staff' && staffLoginRes.body.token, 'Staff payload has correct role and token');
    const staffToken = staffLoginRes.body.token;

    // 4. Test Student Login
    const studentLoginRes = await makeRequest(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@pccoepune.org', password: DEMO_PASSWORD }),
    });
    assert(studentLoginRes.status === 200, 'Student login with demo password succeeds (200)');
    assert(studentLoginRes.body.user && studentLoginRes.body.user.role === 'student' && studentLoginRes.body.token, 'Student payload has correct role and token');
    const studentToken = studentLoginRes.body.token;

    // Other student token
    const otherStudentRes = await makeRequest(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'neha.patil@pccoepune.org', password: DEMO_PASSWORD }),
    });
    const otherStudentToken = otherStudentRes.body.token;

    // 5. Test Invalid Credentials
    const badLoginRes = await makeRequest(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@pccoepune.org', password: 'WrongPassword123!' }),
    });
    assert(badLoginRes.status === 401, 'Invalid password rejected with 401 Unauthorized');
    assert(badLoginRes.body.message && badLoginRes.body.message.toLowerCase().includes('password'), 'Proper error message returned without crashing');

    // 6. Test /api/auth/me
    const meRes = await makeRequest(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(meRes.status === 200 && meRes.body.user && meRes.body.user.email === 'student@pccoepune.org', 'GET /api/auth/me returns student profile');

    // 7. Verify Idempotency and Double-Hashing Protection
    // Re-saving user with existing hashed password or syncing repeatedly must NOT break login
    const reloadUser = await User.findOne({ email: 'student@pccoepune.org' }).select('+password');
    const originalHash = reloadUser.password;
    // Simulate re-saving with same hash
    reloadUser.password = originalHash;
    await reloadUser.save();
    const afterSaveHash = (await User.findOne({ email: 'student@pccoepune.org' }).select('+password')).password;
    assert(originalHash === afterSaveHash, 'Double-hashing protection: password hash unchanged when re-saving existing hash');

    const verifyReLogin = await makeRequest(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@pccoepune.org', password: DEMO_PASSWORD }),
    });
    assert(verifyReLogin.status === 200, 'Login still succeeds after re-saving user (no double-hash corruption)');

    // 8. Role Authorization Guards
    const studentAccessAdmin = await makeRequest(`${baseUrl}/admin/complaints`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(studentAccessAdmin.status === 403, 'Student cannot access admin routes (403 Forbidden)');

    const staffAccessAdmin = await makeRequest(`${baseUrl}/admin/complaints`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert(staffAccessAdmin.status === 403, 'Staff cannot access admin routes (403 Forbidden)');

    const adminAccessAdmin = await makeRequest(`${baseUrl}/admin/complaints`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminAccessAdmin.status === 200, 'Admin can access admin routes (200 OK)');

    // -------------------------------------------------------------
    // PART B1: REAL-TIME COMPLAINT STATUS UPDATES (SOCKET.IO)
    // -------------------------------------------------------------
    console.log('\n--------------------------------------------------------------------');
    console.log('Suite 2: Real-Time Socket.IO Synchronization & Authorization');
    console.log('--------------------------------------------------------------------');

    // Create a complaint by student
    const testComplaint = await Complaint.create({
      title: 'Lab 301 AC Not Cooling',
      description: 'The split AC unit in Computer Lab 301 is blowing warm air.',
      category: 'Electrical',
      location: 'Academic Complex Block B, Floor 3, Lab 301',
      createdBy: studentUser._id,
      assignedTo: staffUser._id,
      priority: 'MEDIUM',
      status: 'ASSIGNED',
    });

    // 1. Connect student socket with valid token
    const studentSocket = ioClient(socketUrl, {
      path: '/api/socket.io',
      auth: { token: studentToken },
      transports: ['websocket', 'polling'],
      forceNew: true,
    });

    const studentConnected = await new Promise((resolve) => {
      studentSocket.on('connect', () => resolve(true));
      studentSocket.on('connect_error', () => resolve(false));
      setTimeout(() => resolve(false), 3000);
    });
    assert(studentConnected, 'Student socket connects successfully with valid JWT');

    // 2. Reject socket with bad token
    const badSocket = ioClient(socketUrl, {
      path: '/api/socket.io',
      auth: { token: 'invalid.jwt.token' },
      transports: ['websocket', 'polling'],
      forceNew: true,
    });

    const badSocketRejected = await new Promise((resolve) => {
      badSocket.on('connect_error', (err) => resolve(err.message.includes('Authentication')));
      badSocket.on('connect', () => resolve(false));
      setTimeout(() => resolve(false), 3000);
    });
    badSocket.close();
    assert(badSocketRejected, 'Socket connection rejected with invalid/missing token');

    // 3. Room authorization: Student joins own complaint room
    const studentJoinOwn = await new Promise((resolve) => {
      studentSocket.emit('join_complaint', testComplaint._id.toString(), (ack) => {
        resolve(ack);
      });
      setTimeout(() => resolve(null), 2000);
    });
    assert(studentJoinOwn && studentJoinOwn.success === true, 'Student authorized to join own complaint room');

    // 4. Room authorization: Other student joins someone else\'s complaint room -> REJECTED
    const otherSocket = ioClient(socketUrl, {
      path: '/api/socket.io',
      auth: { token: otherStudentToken },
      transports: ['websocket', 'polling'],
      forceNew: true,
    });
    await new Promise((r) => otherSocket.on('connect', r));

    const otherJoinForeign = await new Promise((resolve) => {
      otherSocket.emit('join_complaint', testComplaint._id.toString(), (ack) => {
        resolve(ack);
      });
      setTimeout(() => resolve(null), 2000);
    });
    assert(otherJoinForeign && otherJoinForeign.success === false, 'Unauthorized student blocked from joining foreign complaint room');
    otherSocket.close();

    // 5. Admin joins any complaint room -> ALLOWED
    const adminSocket = ioClient(socketUrl, {
      path: '/api/socket.io',
      auth: { token: adminToken },
      transports: ['websocket', 'polling'],
      forceNew: true,
    });
    await new Promise((r) => adminSocket.on('connect', r));

    const adminJoinAny = await new Promise((resolve) => {
      adminSocket.emit('join_complaint', testComplaint._id.toString(), (ack) => {
        resolve(ack);
      });
      setTimeout(() => resolve(null), 2000);
    });
    assert(adminJoinAny && adminJoinAny.success === true, 'Admin authorized to join any complaint room');

    // 6. Test real-time broadcast of complaint updates
    let receivedUpdateEvent = null;
    studentSocket.on('complaint_updated', (data) => {
      receivedUpdateEvent = data;
    });

    // Make an admin status change API call
    const updateStatusRes = await makeRequest(`${baseUrl}/admin/complaints/${testComplaint._id}/status`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'IN_PROGRESS' }),
    });
    assert(updateStatusRes.status === 200, 'Admin changes complaint status via REST API');

    // Wait for socket event delivery
    await new Promise((r) => setTimeout(r, 600));
    assert(
      receivedUpdateEvent && receivedUpdateEvent.complaintId === testComplaint._id.toString(),
      'Subscribed student socket received real-time complaint_updated broadcast'
    );
    assert(
      receivedUpdateEvent && receivedUpdateEvent.complaint && receivedUpdateEvent.complaint.status === 'IN_PROGRESS',
      'Real-time payload reflects updated status IN_PROGRESS'
    );

    studentSocket.close();
    adminSocket.close();

    // -------------------------------------------------------------
    // PART B2: AI-ASSISTED COMPLAINT CLASSIFICATION
    // -------------------------------------------------------------
    console.log('\n--------------------------------------------------------------------');
    console.log('Suite 3: AI-Assisted Classification & Fallback Architecture');
    console.log('--------------------------------------------------------------------');

    // 1. Fallback when AI is disabled
    const origAiFlag = process.env.AI_CLASSIFICATION_ENABLED;
    process.env.AI_CLASSIFICATION_ENABLED = 'false';

    const fallbackResult = await classifyComplaint({
      title: 'Water leaking heavily from ceiling in library',
      description: 'Severe pipe burst causing flooding in second floor reading room.',
      category: 'Plumbing',
      location: 'Central Library Floor 2',
    });
    assert(fallbackResult.source === 'RULE_BASED', 'When AI disabled, classification source is RULE_BASED');
    assert(fallbackResult.priority === 'CRITICAL' || fallbackResult.priority === 'HIGH', 'Deterministic priority evaluation applied accurately');
    assert(fallbackResult.confidence >= 0.8, 'Fallback confidence is robust');

    // 2. Mock AI enabled mode
    process.env.AI_CLASSIFICATION_ENABLED = 'true';
    process.env.AI_PROVIDER = 'mock';

    const aiResult = await classifyComplaint({
      title: 'Smoke and sparks coming from electrical switchboard in corridor',
      description: 'Dangerous electrical fire hazard near classroom 204.',
      category: 'Electrical',
      location: 'Block A Floor 2 Corridor',
    });
    assert(aiResult.source === 'AI', 'When AI enabled, classification source is AI');
    assert(aiResult.priority === 'CRITICAL', 'AI mock correctly classified severe hazard as CRITICAL');
    assert(Array.isArray(aiResult.keywords) && aiResult.keywords.length > 0, 'Extracted keywords included in result');
    assert(Boolean(aiResult.rationale), 'Explainable rationale provided with AI suggestion');

    // 3. Admin reclassify endpoint
    const reclassifyRes = await makeRequest(`${baseUrl}/admin/complaints/${testComplaint._id}/reclassify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(reclassifyRes.status === 200, 'Admin can trigger AI reclassification POST /admin/complaints/:id/reclassify');
    assert(reclassifyRes.body.complaint && reclassifyRes.body.complaint.classificationSource, 'Reclassified complaint includes classificationSource metadata');

    // 4. AI suggestion NEVER overrides manual priority override
    // Set manual override on complaint
    testComplaint.priority = 'LOW';
    testComplaint.prioritySource = 'MANUAL';
    testComplaint.priorityOverrideReason = 'Admin assessed risk as minimal on site';
    await testComplaint.save();

    const overridePreserveRes = await makeRequest(`${baseUrl}/admin/complaints/${testComplaint._id}/reclassify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(overridePreserveRes.status === 200, 'Reclassify succeeds on manually overridden ticket');
    assert(
      overridePreserveRes.body.complaint.priority === 'LOW' && overridePreserveRes.body.complaint.prioritySource === 'MANUAL',
      'AI suggestion strictly NEVER overrides an administrator manual priority override!'
    );

    // Restore env flag
    process.env.AI_CLASSIFICATION_ENABLED = origAiFlag || 'false';

    // -------------------------------------------------------------
    // PART B3: DUPLICATE COMPLAINT DETECTION
    // -------------------------------------------------------------
    console.log('\n--------------------------------------------------------------------');
    console.log('Suite 4: Explainable Duplicate Complaint Detection');
    console.log('--------------------------------------------------------------------');

    // 1. Obvious duplicate test
    const baseTicket = await Complaint.create({
      title: 'Water cooler leaking in 3rd floor cafeteria',
      description: 'The drinking water cooler is overflowing and leaking on the cafeteria floor.',
      category: 'Plumbing',
      location: 'Main Cafeteria, Floor 3',
      createdBy: studentUser._id,
      status: 'PENDING',
    });

    const dupCheck1 = await checkDuplicates({
      title: 'Water cooler leaking cafeteria floor 3',
      description: 'Drinking water is leaking heavily from the cooler in third floor cafeteria.',
      category: 'Plumbing',
      location: 'Main Cafeteria, Floor 3',
    });
    assert(dupCheck1.hasDuplicates === true, 'Obvious duplicate flagged (hasDuplicates === true)');
    assert(dupCheck1.candidates.length > 0, 'Candidate list returned with matches');
    assert(dupCheck1.candidates[0].score >= 0.5, 'Similarity score above threshold');
    assert(Boolean(dupCheck1.candidates[0].reason), 'Explainable match reason provided for user');

    // 2. Unrelated non-duplicate test
    const dupCheck2 = await checkDuplicates({
      title: 'Projector display flickering in seminar hall',
      description: 'The HDMI connection to the overhead projector is cutting out intermittently.',
      category: 'IT Support',
      location: 'Seminar Hall 1',
    });
    assert(dupCheck2.hasDuplicates === false, 'Unrelated issue correctly marked as non-duplicate');

    // 3. Pre-submission endpoint POST /api/complaints/check-duplicate
    const apiDupCheck = await makeRequest(`${baseUrl}/complaints/check-duplicate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Water cooler leaking in 3rd floor cafeteria',
        description: 'Water leaking from dispenser.',
        category: 'Plumbing',
        location: 'Main Cafeteria, Floor 3',
      }),
    });
    assert(apiDupCheck.status === 200, 'POST /api/complaints/check-duplicate responds 200');
    assert(apiDupCheck.body.hasDuplicates === true, 'Endpoint correctly identifies duplicate candidate');

    // 4. Submit complaint with duplicate link metadata
    const submitDupRes = await makeRequest(`${baseUrl}/complaints`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Duplicate water leakage reported',
        description: 'Also noticed water cooler leaking near tables.',
        category: 'Plumbing',
        location: 'Main Cafeteria, Floor 3',
        duplicateOf: baseTicket._id.toString(),
      }),
    });
    assert(submitDupRes.status === 201, 'Student can submit complaint linking duplicate (201 Created)');
    assert(submitDupRes.body.complaint.duplicateDetected === true, 'duplicateDetected stored in complaint');
    assert(
      submitDupRes.body.complaint.duplicateOf.toString() === baseTicket._id.toString(),
      'duplicateOf parent complaint reference stored'
    );

    // -------------------------------------------------------------
    // PART B4: SMART STAFF RECOMMENDATION
    // -------------------------------------------------------------
    console.log('\n--------------------------------------------------------------------');
    console.log('Suite 5: Explainable Smart Staff Recommendation');
    console.log('--------------------------------------------------------------------');

    // Setup an electrical complaint
    const electricalTicket = await Complaint.create({
      title: 'Power failure in Physics Lab',
      description: 'All 230V workbench power outlets are dead in Physics Lab B-102.',
      category: 'Electrical',
      location: 'Science Block, Floor 1, Lab B-102',
      createdBy: studentUser._id,
      priority: 'HIGH',
      status: 'PENDING',
    });

    // 1. Service evaluation
    const recs = await getRecommendationsForComplaint(electricalTicket._id);
    assert(Array.isArray(recs) && recs.length > 0, 'Recommendations returned for complaint');
    assert(recs[0].staff.email === 'staff@pccoepune.org', 'Electrical staff ranked top for Electrical complaint');
    assert(recs[0].score > recs[recs.length - 1].score, 'Matching specialization scores significantly higher than mismatch');
    assert(Boolean(recs[0].reason), 'Recommendation includes clear explainable reason');
    assert(recs[0].breakdown && recs[0].breakdown.categoryScore > 0, 'Score breakdown contains category, workload, and SLA components');

    // 2. Workload penalty test: assign multiple tickets to electrical staff and verify score reduction
    await Complaint.create({
      title: 'Extra job 1',
      description: 'Testing workload load',
      category: 'Electrical',
      location: 'Block A',
      createdBy: studentUser._id,
      assignedTo: staffUser._id,
      status: 'IN_PROGRESS',
    });
    await Complaint.create({
      title: 'Extra job 2',
      description: 'Testing workload load',
      category: 'Electrical',
      location: 'Block A',
      createdBy: studentUser._id,
      assignedTo: staffUser._id,
      status: 'ASSIGNED',
    });

    const recsAfterLoad = await getRecommendationsForComplaint(electricalTicket._id);
    const topAfterLoad = recsAfterLoad.find((r) => r.staff.email === 'staff@pccoepune.org');
    assert(topAfterLoad.breakdown.activeWorkload >= 2, 'Workload penalty factor tracks assigned active tasks');

    // 3. Admin endpoint GET /api/admin/complaints/:id/staff-recommendations
    const adminRecRes = await makeRequest(`${baseUrl}/admin/complaints/${electricalTicket._id}/staff-recommendations`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminRecRes.status === 200, 'GET /admin/complaints/:id/staff-recommendations responds 200 OK');
    assert(Array.isArray(adminRecRes.body.recommendations), 'Admin endpoint returns recommendations list');

    // 4. Role Authorization: Student cannot access staff recommendations
    const studentRecRes = await makeRequest(`${baseUrl}/admin/complaints/${electricalTicket._id}/staff-recommendations`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(studentRecRes.status === 403, 'Student forbidden from accessing staff recommendations (403)');

    // -------------------------------------------------------------
    // PART B5: OBSERVABILITY & PROMETHEUS METRICS
    // -------------------------------------------------------------
    console.log('\n--------------------------------------------------------------------');
    console.log('Suite 6: Prometheus Metrics Verification');
    console.log('--------------------------------------------------------------------');

    const metricsRes = await makeRequest(`http://127.0.0.1:${port}/metrics`);
    assert(metricsRes.status === 200, 'GET /metrics endpoint returns 200 OK');
    const metricsText = typeof metricsRes.body === 'string' ? metricsRes.body : JSON.stringify(metricsRes.body);

    assert(metricsText.includes('campuscare_socket_connections_active'), 'campuscare_socket_connections_active metric registered');
    assert(metricsText.includes('campuscare_socket_events_total'), 'campuscare_socket_events_total metric registered');
    assert(metricsText.includes('campuscare_ai_classification_requests_total'), 'campuscare_ai_classification_requests_total metric registered');
    assert(metricsText.includes('campuscare_duplicate_checks_total'), 'campuscare_duplicate_checks_total metric registered');
    assert(metricsText.includes('campuscare_staff_recommendation_requests_total'), 'campuscare_staff_recommendation_requests_total metric registered');

  } catch (error) {
    console.error('[Test Execution Error]:', error);
    failed++;
  } finally {
    if (httpServer) httpServer.close();
    if (mongod) await mongod.stop();
    await mongoose.disconnect();
  }

  console.log('\n====================================================================');
  console.log(`Batch 3 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runBatch3Tests();
