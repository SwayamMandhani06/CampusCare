/**
 * Batch 2 Verification Suite for CampusCare 2.0
 * 
 * Verifies end-to-end:
 * 1. Deterministic Rule-Based Priority Automation (CRITICAL, HIGH, MEDIUM, LOW)
 * 2. SLA Policy Engine & Deadline Calculations
 * 3. Authoritative Response and Resolution SLA Tracking
 * 4. Real-time SLA Status Calculation (ON_TRACK, AT_RISK, BREACHED, RESOLVED)
 * 5. Admin Manual Priority Override with Mandatory Reason
 * 6. Role Authorization Guards (students and staff prohibited from overriding priority)
 * 7. Multi-Replica Safe Distributed Lease Locking (SystemLock)
 * 8. Automated SLA Scheduler, Risk Detection, and Multi-Level Escalation
 * 9. Preservation of Manual Priority Override during Escalation
 * 10. Prevention of Duplicate Escalation & Notifications
 * 11. Admin Dashboard SLA KPI Metrics
 * 12. Advanced Query Filtering by SLA Status, Escalation, and Priority Source
 */

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');

require('dotenv').config();
process.env.JWT_SECRET = process.env.JWT_SECRET || 'campuscare_batch2_jwt_secret_2026';
process.env.EMAIL_ENABLED = 'false'; // Ensure email is in safe disabled mode during tests
process.env.ENABLE_SLA_SCHEDULER = 'false'; // Manual control in tests

const User = require('./models/User');
const Complaint = require('./models/Complaint');
const SystemLock = require('./models/SystemLock');
const { evaluatePriority } = require('./services/priorityService');
const {
  SLA_POLICY,
  calculateSlaDeadlines,
  recordFirstResponse,
  recordResolution,
  computeSlaStatus,
} = require('./services/slaService');
const {
  runSlaCheckOnce,
  acquireSlaLease,
} = require('./services/slaScheduler');

const authRoutes = require('./routes/auth');
const complaintRoutes = require('./routes/complaints');
const adminRoutes = require('./routes/admin');
const staffRoutes = require('./routes/staff');
const notificationRoutes = require('./routes/notifications');

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

async function runBatch2Tests() {
  console.log('====================================================================');
  console.log('       CampusCare 2.0 Batch 2 End-to-End Verification Suite        ');
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

  // Set up Express application
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use('/api/auth', authRoutes);
  app.use('/api/complaints', complaintRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/staff', staffRoutes);
  app.use('/api/notifications', notificationRoutes);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;
  console.log(`[Server] Test server listening on ${baseUrl}\n`);

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // PART 1: Priority Service Unit Tests (Deterministic Rules)
    // -------------------------------------------------------------
    console.log('--- SECTION 1: Deterministic Rule-Based Priority Engine ---');

    const evalCritical1 = evaluatePriority({
      title: 'Exposed live wire in corridor',
      description: 'Sparks flying from open switchboard near room 204',
      category: 'Electrical',
      location: 'Block B Floor 2',
    });
    assert(
      evalCritical1.priority === 'CRITICAL' && evalCritical1.priorityReason.length > 5,
      'Detects CRITICAL for electrical hazard / exposed live wire'
    );

    const evalCritical2 = evaluatePriority({
      title: 'Water pipe burst causing flooding',
      description: 'Major flooding in hallway, water rising rapidly',
      category: 'Plumbing',
      location: 'Basement',
    });
    assert(
      evalCritical2.priority === 'CRITICAL' && evalCritical2.priorityReason.length > 5,
      'Detects CRITICAL for major flooding emergency'
    );

    const evalHigh1 = evaluatePriority({
      title: 'Server room AC failure',
      description: 'Main server overheating, entire campus network down',
      category: 'Network',
      location: 'Data Center',
    });
    assert(
      evalHigh1.priority === 'HIGH' && evalHigh1.priorityReason.length > 5,
      'Detects HIGH for widespread outage and server failure'
    );

    const evalHigh2 = evaluatePriority({
      title: 'Chemistry lab exhaust hood broken',
      description: 'Laboratory ventilation fan stopped during lab session',
      category: 'Laboratory',
      location: 'Science Block Lab 3',
    });
    assert(
      evalHigh2.priority === 'HIGH' && evalHigh2.priorityReason.length > 5,
      'Detects HIGH for laboratory equipment failure'
    );

    const evalMedium1 = evaluatePriority({
      title: 'Classroom projector bulb flickering',
      description: 'Projector display intermittent during lecture',
      category: 'Classroom Infrastructure',
      location: 'Lecture Hall 101',
    });
    assert(
      evalMedium1.priority === 'MEDIUM' && evalMedium1.priorityReason.length > 5,
      'Detects MEDIUM for classroom equipment failure'
    );

    const evalLow1 = evaluatePriority({
      title: 'Loose chair armrest in common room',
      description: 'Slightly wobbly armrest on sofa, purely cosmetic wear and tear',
      category: 'Furniture & Civil',
      location: 'Student Lounge',
    });
    assert(
      evalLow1.priority === 'LOW' && evalLow1.priorityReason.length > 5,
      'Detects LOW for minor cosmetic / non-urgent wear'
    );

    // -------------------------------------------------------------
    // PART 2: SLA Policy Engine Unit Tests
    // -------------------------------------------------------------
    console.log('\n--- SECTION 2: SLA Policy Engine & Deadline Calculations ---');

    const baseTime = new Date('2026-10-01T10:00:00.000Z');

    // CRITICAL: 1h response, 8h resolution
    const slaCrit = calculateSlaDeadlines('CRITICAL', baseTime);
    assert(
      slaCrit.responseTargetMinutes === 60 && slaCrit.resolutionTargetMinutes === 480,
      'CRITICAL targets: 60m response, 480m resolution'
    );
    assert(
      new Date(slaCrit.responseDeadline).toISOString() === '2026-10-01T11:00:00.000Z',
      'CRITICAL response deadline is exactly +1h'
    );
    assert(
      new Date(slaCrit.resolutionDeadline).toISOString() === '2026-10-01T18:00:00.000Z',
      'CRITICAL resolution deadline is exactly +8h'
    );

    // HIGH: 4h response, 24h resolution
    const slaHigh = calculateSlaDeadlines('HIGH', baseTime);
    assert(
      slaHigh.responseTargetMinutes === 240 && slaHigh.resolutionTargetMinutes === 1440,
      'HIGH targets: 240m response, 1440m resolution'
    );

    // MEDIUM: 12h response, 48h resolution
    const slaMed = calculateSlaDeadlines('MEDIUM', baseTime);
    assert(
      slaMed.responseTargetMinutes === 720 && slaMed.resolutionTargetMinutes === 2880,
      'MEDIUM targets: 720m response, 2880m resolution'
    );

    // LOW: 24h response, 72h resolution
    const slaLow = calculateSlaDeadlines('LOW', baseTime);
    assert(
      slaLow.responseTargetMinutes === 1440 && slaLow.resolutionTargetMinutes === 4320,
      'LOW targets: 1440m response, 4320m resolution'
    );

    // Test computeSlaStatus: ON_TRACK vs AT_RISK vs BREACHED
    // Mark responseAt as satisfied within response target window
    const dummyComplaint = {
      createdAt: new Date('2026-10-01T10:00:00.000Z'),
      priority: 'HIGH',
      sla: {
        ...slaHigh,
        responseAt: new Date('2026-10-01T11:00:00.000Z'), // responded after 1 hour (well within 4 hours)
      },
      status: 'IN_PROGRESS',
    };

    // 10 hours in (14 hours left out of 24 -> > 25% left): ON_TRACK
    const statusOnTrack = computeSlaStatus(dummyComplaint, new Date('2026-10-01T20:00:00.000Z'));
    assert(statusOnTrack.status === 'ON_TRACK' && !statusOnTrack.isAtRisk, 'SLA status is ON_TRACK when >25% time remains');

    // 20 hours in (4 hours left out of 24 -> 4/24 = 16.6% <= 25%): AT_RISK
    const statusAtRisk = computeSlaStatus(dummyComplaint, new Date('2026-10-02T06:00:00.000Z'));
    assert(statusAtRisk.status === 'AT_RISK' && statusAtRisk.isAtRisk, 'SLA status is AT_RISK when <=25% time remains');

    // 25 hours in (deadline passed): BREACHED
    const statusBreached = computeSlaStatus(dummyComplaint, new Date('2026-10-02T11:00:00.000Z'));
    assert(statusBreached.status === 'BREACHED' && statusBreached.isBreached, 'SLA status is BREACHED when deadline passed');

    // RESOLVED status check
    const resolvedComplaint = { ...dummyComplaint, status: 'RESOLVED', sla: { ...slaHigh, resolutionAt: new Date() } };
    const statusResolved = computeSlaStatus(resolvedComplaint, new Date('2026-10-02T11:00:00.000Z'));
    assert(statusResolved.status === 'RESOLVED' && statusResolved.isResolved, 'SLA status is RESOLVED when ticket is completed');

    // -------------------------------------------------------------
    // PART 3: User Setup & Authentication API Tests
    // -------------------------------------------------------------
    console.log('\n--- SECTION 3: User Setup & Authentication ---');

    await User.deleteMany({});
    await Complaint.deleteMany({});
    await SystemLock.deleteMany({});

    // Register Student
    const regStudent = await makeRequest(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'SLA Student Test',
        email: 'sla.student@campuscare.edu',
        password: 'Password123!',
        role: 'student',
        studentId: 'STU-SLA-001',
      }),
    });
    assert(regStudent.status === 201, 'Student registered successfully');
    const studentToken = regStudent.body.token;
    const studentUser = { ...regStudent.body.user, _id: regStudent.body.user.id };

    // Register Staff
    const regStaff = await makeRequest(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'SLA Electrician Test',
        email: 'sla.electrician@campuscare.edu',
        password: 'Password123!',
        role: 'staff',
        department: 'Electrical Maintenance',
      }),
    });
    assert(regStaff.status === 201, 'Staff registered successfully');
    const staffToken = regStaff.body.token;
    const staffUser = { ...regStaff.body.user, _id: regStaff.body.user.id };

    // Register Admin
    const regAdmin = await makeRequest(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'SLA Admin Test',
        email: 'sla.admin@campuscare.edu',
        password: 'Password123!',
        role: 'admin',
      }),
    });
    assert(regAdmin.status === 201, 'Admin registered successfully');
    const adminToken = regAdmin.body.token;
    const adminUser = { ...regAdmin.body.user, _id: regAdmin.body.user.id };

    // -------------------------------------------------------------
    // PART 4: Complaint Creation & Automatic Priority Evaluation
    // -------------------------------------------------------------
    console.log('\n--- SECTION 4: Complaint Creation with Intelligent Priority & SLA ---');

    const createRes = await makeRequest(`${baseUrl}/complaints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        title: 'Dangerous exposed live wires with smoke in library',
        description: 'Smoke coming from circuit breaker, immediate electrical fire hazard',
        category: 'Electrical',
        location: 'Central Library 1st Floor',
      }),
    });

    assert(createRes.status === 201, 'Complaint created successfully via student endpoint');
    const complaint1 = createRes.body.complaint;

    assert(complaint1.priority === 'CRITICAL', 'Priority automatically classified as CRITICAL');
    assert(complaint1.prioritySource === 'AUTOMATIC', 'Priority source is AUTOMATIC');
    assert(complaint1.priorityReason.length > 10, 'Priority reason is detailed');
    assert(complaint1.sla && complaint1.sla.responseDeadline, 'SLA deadlines initialized in document');

    const timelineAutoEvent = complaint1.activityTimeline.find((e) => e.eventType === 'PRIORITY_AUTO_ASSIGNED');
    const timelineSlaEvent = complaint1.activityTimeline.find((e) => e.eventType === 'SLA_STARTED');
    assert(!!timelineAutoEvent, 'Activity timeline includes PRIORITY_AUTO_ASSIGNED event');
    assert(!!timelineSlaEvent, 'Activity timeline includes SLA_STARTED event');

    // -------------------------------------------------------------
    // PART 5: Real-time SLA attached on getComplaintById
    // -------------------------------------------------------------
    console.log('\n--- SECTION 5: Real-Time SLA Status Exposure in API ---');

    const getDetailRes = await makeRequest(`${baseUrl}/complaints/${complaint1._id}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(getDetailRes.status === 200, 'Student can fetch complaint detail');
    assert(getDetailRes.body.complaint.realTimeSla !== undefined, 'Complaint detail contains computed realTimeSla metrics');
    assert(getDetailRes.body.complaint.realTimeSla.status === 'ON_TRACK', 'Real-time SLA status starts ON_TRACK');

    // -------------------------------------------------------------
    // PART 6: First Response SLA Tracking via Staff / Admin Action
    // -------------------------------------------------------------
    console.log('\n--- SECTION 6: Response SLA Tracking ---');

    // Admin assigns staff to ticket
    const assignRes = await makeRequest(`${baseUrl}/admin/complaints/${complaint1._id}/assign`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ staffId: staffUser._id }),
    });

    if (assignRes.status !== 200) {
      console.log('assignRes debug:', assignRes.status, assignRes.body);
    }
    assert(assignRes.status === 200, 'Admin successfully assigns staff to complaint');
    const assignedComplaint = assignRes.body.complaint;
    assert(assignedComplaint.sla.responseAt !== null, 'Response SLA recorded upon assignment (first response)');
    assert(assignedComplaint.sla.responseBreached === false, 'First response achieved within target (not breached)');

    // -------------------------------------------------------------
    // PART 7: Manual Priority Override by Admin (with validation)
    // -------------------------------------------------------------
    console.log('\n--- SECTION 7: Manual Priority Override ---');

    // 7A: Student cannot change priority
    const studentOverride = await makeRequest(`${baseUrl}/admin/complaints/${complaint1._id}/priority`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({ priority: 'LOW', reason: 'Student trying to override' }),
    });
    assert(studentOverride.status === 403, 'Student is forbidden from overriding priority (403)');

    // 7B: Staff cannot change priority
    const staffOverride = await makeRequest(`${baseUrl}/admin/complaints/${complaint1._id}/priority`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({ priority: 'LOW', reason: 'Staff trying to override' }),
    });
    assert(staffOverride.status === 403, 'Staff is forbidden from overriding priority (403)');

    // 7C: Admin must provide valid reason (reject if empty or < 5 chars)
    const adminShortReason = await makeRequest(`${baseUrl}/admin/complaints/${complaint1._id}/priority`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ priority: 'HIGH', reason: 'no' }),
    });
    assert(adminShortReason.status === 400, 'Admin override requires reason with min 5 characters (400)');

    // 7D: Admin successful override
    const adminOverrideSuccess = await makeRequest(`${baseUrl}/admin/complaints/${complaint1._id}/priority`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        priority: 'HIGH',
        reason: 'Temporary breaker isolated, reclassified to HIGH pending replacement part delivery',
      }),
    });
    assert(adminOverrideSuccess.status === 200, 'Admin successfully overrides priority');
    const overriddenComplaint = adminOverrideSuccess.body.complaint;
    assert(overriddenComplaint.priority === 'HIGH', 'Priority updated to HIGH');
    assert(overriddenComplaint.prioritySource === 'MANUAL', 'Priority source changed to MANUAL');
    assert(overriddenComplaint.priorityReason.includes('Temporary breaker isolated'), 'Priority reason recorded');
    assert(overriddenComplaint.sla.resolutionTargetMinutes === 1440, 'SLA target minutes recalculated for HIGH policy');

    const priorityChangedEvent = overriddenComplaint.activityTimeline.find((e) => e.eventType === 'PRIORITY_CHANGED');
    assert(!!priorityChangedEvent, 'Activity timeline records PRIORITY_CHANGED event with reason and actor');

    // -------------------------------------------------------------
    // PART 8: Multi-Replica Safe Distributed Lease Lock
    // -------------------------------------------------------------
    console.log('\n--- SECTION 8: Multi-Replica Safe Lease Mechanism ---');

    const leaseAcquired1 = await acquireSlaLease(60000);
    assert(leaseAcquired1 === true, 'First worker successfully acquires distributed SLA lease');

    // Check SystemLock document
    const lockDoc = await SystemLock.findOne({ lockKey: 'sla-monitoring-lease' });
    assert(lockDoc !== null && lockDoc.lockedUntil > new Date(), 'SystemLock document persists lease expiration in MongoDB');

    // -------------------------------------------------------------
    // PART 9: Automated SLA Monitoring & Escalation Engine
    // -------------------------------------------------------------
    console.log('\n--- SECTION 9: Automated SLA Monitoring, Breach Detection & Escalation ---');

    // Create a ticket that is 25 hours old (HIGH SLA resolution target is 24h, so 1h overdue < 2h threshold for Level 2)
    const pastCreatedTime = new Date(Date.now() - 25 * 3600 * 1000);
    const pastDeadlines = calculateSlaDeadlines('HIGH', pastCreatedTime);

    const breachedTicket = await Complaint.create({
      title: 'Chemistry lab chemical spill drainage blockage',
      description: 'Major drainage backup in main laboratory sink',
      category: 'Equipment',
      location: 'Science Building Lab 102',
      priority: 'HIGH',
      prioritySource: 'AUTOMATIC',
      priorityReason: 'Laboratory facility issue affecting students.',
      createdAt: pastCreatedTime,
      sla: pastDeadlines,
      status: 'IN_PROGRESS',
      createdBy: studentUser._id,
      assignedTo: staffUser._id,
    });

    // Run SLA check cycle (bypassLock for deterministic test run)
    const checkStats = await runSlaCheckOnce({ bypassLock: true });
    assert(checkStats.breached >= 1, 'Scheduler detects SLA breach on overdue ticket');
    assert(checkStats.escalated >= 1, 'Scheduler triggers escalation on overdue ticket');

    // Reload ticket from database
    const refreshedBreached = await Complaint.findById(breachedTicket._id);
    assert(refreshedBreached.sla.status === 'BREACHED', 'Ticket SLA status transitioned to BREACHED');
    assert(refreshedBreached.sla.escalated === true, 'Ticket marked escalated');
    assert(refreshedBreached.sla.escalationLevel === 1, 'Ticket escalation level set to 1');
    assert(refreshedBreached.sla.breachNotified === true, 'breachNotified flag set to prevent duplicate notifications');

    // Priority auto-escalation check: Since prioritySource is AUTOMATIC, HIGH should escalate to CRITICAL!
    assert(refreshedBreached.priority === 'CRITICAL', 'Priority automatically escalated from HIGH to CRITICAL upon SLA breach');

    // Check timeline events
    const breachEvent = refreshedBreached.activityTimeline.find((e) => e.eventType === 'SLA_BREACHED');
    const escalateEvent = refreshedBreached.activityTimeline.find((e) => e.eventType === 'COMPLAINT_ESCALATED');
    assert(!!breachEvent, 'Activity timeline includes SLA_BREACHED event');
    assert(!!escalateEvent, 'Activity timeline includes COMPLAINT_ESCALATED event');

    // Run scheduler again immediately: verify NO duplicate escalations
    const secondCheckStats = await runSlaCheckOnce({ bypassLock: true });
    assert(secondCheckStats.breached === 0, 'Subsequent scheduler cycle does NOT re-breach or spam notifications');

    // Test Level 2 persistent delay escalation: ticket overdue by > 120 minutes (e.g. 5 hours overdue)
    const persistentCreatedTime = new Date(Date.now() - 29 * 3600 * 1000);
    const persistentDeadlines = calculateSlaDeadlines('HIGH', persistentCreatedTime);
    persistentDeadlines.escalationLevel = 1; // already at Level 1
    persistentDeadlines.breachNotified = true;
    persistentDeadlines.escalation1Notified = true;

    const persistentTicket = await Complaint.create({
      title: 'Persistent lab drainage blockage',
      description: 'Still unresolved after multiple hours past deadline',
      category: 'Equipment',
      location: 'Science Building Lab 102',
      priority: 'HIGH',
      prioritySource: 'AUTOMATIC',
      priorityReason: 'Persistent breach test',
      createdAt: persistentCreatedTime,
      sla: persistentDeadlines,
      status: 'IN_PROGRESS',
      createdBy: studentUser._id,
      assignedTo: staffUser._id,
    });

    await runSlaCheckOnce({ bypassLock: true });
    const refreshedPersistent = await Complaint.findById(persistentTicket._id);
    assert(refreshedPersistent.sla.escalationLevel === 2, 'Persistent delay triggers Level 2 executive escalation');
    assert(refreshedPersistent.sla.escalation2Notified === true, 'escalation2Notified set to prevent duplicate alerts');

    // -------------------------------------------------------------
    // PART 10: Manual Priority Respect During Escalation
    // -------------------------------------------------------------
    console.log('\n--- SECTION 10: Manual Priority Respect During Escalation ---');

    // Create a ticket that has prioritySource = 'MANUAL' (admin override) and is past deadline
    const manualPastTicket = await Complaint.create({
      title: 'Routine chair armrest replacement',
      description: 'Cosmetic loose armrest in study area',
      category: 'Furniture',
      location: 'Reading Hall',
      priority: 'LOW',
      prioritySource: 'MANUAL',
      priorityReason: 'Admin manually decided LOW priority.',
      createdAt: new Date(Date.now() - 100 * 3600 * 1000), // Over 72h overdue
      sla: calculateSlaDeadlines('LOW', new Date(Date.now() - 100 * 3600 * 1000)),
      status: 'ASSIGNED',
      createdBy: studentUser._id,
      assignedTo: staffUser._id,
    });

    await runSlaCheckOnce({ bypassLock: true });
    const refreshedManual = await Complaint.findById(manualPastTicket._id);
    assert(refreshedManual.sla.status === 'BREACHED', 'Manual ticket SLA status transitioned to BREACHED');
    assert(refreshedManual.priority === 'LOW', 'Automatic engine does NOT overwrite manually assigned priority (stays LOW)');

    // -------------------------------------------------------------
    // PART 11: Resolution SLA Tracking
    // -------------------------------------------------------------
    console.log('\n--- SECTION 11: Resolution SLA Tracking ---');

    // Staff resolves complaint1
    const resolveRes = await makeRequest(`${baseUrl}/staff/tasks/${complaint1._id}/resolve`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({ resolutionNotes: 'Replaced circuit breaker and verified electrical load safety.' }),
    });

    assert(resolveRes.status === 200, 'Staff resolves task successfully');
    const resolvedTicket = resolveRes.body.task;
    assert(resolvedTicket.status === 'RESOLVED', 'Complaint status is RESOLVED');
    assert(resolvedTicket.sla.resolutionAt !== null, 'Resolution timestamp recorded in SLA');
    assert(resolvedTicket.sla.status === 'RESOLVED', 'SLA status transitioned to RESOLVED');

    const slaResolvedEvent = resolvedTicket.activityTimeline.find((e) => e.eventType === 'SLA_RESOLVED');
    assert(!!slaResolvedEvent, 'Activity timeline includes SLA_RESOLVED event');

    // -------------------------------------------------------------
    // PART 12: Admin Dashboard SLA KPI Metrics
    // -------------------------------------------------------------
    console.log('\n--- SECTION 12: Admin Dashboard SLA KPI Metrics ---');

    const dashRes = await makeRequest(`${baseUrl}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(dashRes.status === 200, 'Admin can fetch dashboard analytics');
    const slaMetrics = dashRes.body.data.slaMetrics;
    assert(slaMetrics !== undefined, 'Dashboard response contains slaMetrics object');
    assert(typeof slaMetrics.totalActive === 'number', 'slaMetrics.totalActive is a number');
    assert(typeof slaMetrics.onTrack === 'number', 'slaMetrics.onTrack is a number');
    assert(typeof slaMetrics.atRisk === 'number', 'slaMetrics.atRisk is a number');
    assert(typeof slaMetrics.breached === 'number', 'slaMetrics.breached is a number');
    assert(typeof slaMetrics.escalated === 'number', 'slaMetrics.escalated is a number');
    assert(typeof slaMetrics.averageResolutionTimeHours === 'number', 'slaMetrics.averageResolutionTimeHours is a number');
    assert(typeof slaMetrics.slaCompliancePercentage === 'number', 'slaMetrics.slaCompliancePercentage is a number');

    // -------------------------------------------------------------
    // PART 13: Query Filtering by SLA Status and Priority Source
    // -------------------------------------------------------------
    console.log('\n--- SECTION 13: Advanced Query Filtering ---');

    const filterBreached = await makeRequest(`${baseUrl}/admin/complaints?slaStatus=BREACHED`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(filterBreached.status === 200, 'Admin can filter complaints by slaStatus=BREACHED');
    assert(filterBreached.body.complaints.every((c) => c.sla.status === 'BREACHED'), 'All returned complaints have SLA status BREACHED');

    const filterManual = await makeRequest(`${baseUrl}/admin/complaints?prioritySource=MANUAL`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(filterManual.status === 200, 'Admin can filter complaints by prioritySource=MANUAL');
    assert(filterManual.body.complaints.every((c) => c.prioritySource === 'MANUAL'), 'All returned complaints have prioritySource MANUAL');

    const filterEscalated = await makeRequest(`${baseUrl}/admin/complaints?escalated=true`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(filterEscalated.status === 200, 'Admin can filter complaints by escalated=true');
    assert(filterEscalated.body.complaints.every((c) => c.sla.escalated === true), 'All returned complaints are marked escalated');

    // -------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------
    console.log('\n====================================================================');
    console.log(` Batch 2 Verification Results: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error during Batch 2 test execution:', err);
    process.exit(1);
  } finally {
    server.close();
    await mongoose.disconnect();
    if (mongod) {
      await mongod.stop();
    }
  }
}

runBatch2Tests();
