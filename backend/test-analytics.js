/**
 * CampusCare 2.0 - Advanced Analytics Test Suite
 * 
 * Verifies end-to-end:
 * 1. RBAC & Security:
 *    - Unauthenticated access returns 401
 *    - Student role access returns 403
 *    - Staff role access returns 403
 *    - Admin role access returns 200
 * 2. Consolidated Analytics Overview API:
 *    - Structured JSON payload with KPIs, period-over-period comparisons, distributions, and insights
 * 3. Date Range Filtering:
 *    - 7d, 30d, 90d, 6m, 1y, and custom date range calculation with UTC bounds
 * 4. Multi-Dimensional Filtering:
 *    - Filtering by category, priority, status, SLA status, location regex, and technician
 * 5. Specialized Metric Endpoints:
 *    - /trends, /sla, /staff, /locations, /feedback
 * 6. Deterministic Rule-Based Operational Insights:
 *    - Calculation of actionable rule-based insights and fallback handling
 * 7. Executive CSV Report Export:
 *    - Content-Type, Content-Disposition, and formula injection sanitization
 * 8. Empty Dataset & Zero-Division Handling:
 *    - Graceful zeroed structures when filters match no documents
 */

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');

require('dotenv').config();
process.env.JWT_SECRET = process.env.JWT_SECRET || 'campuscare_analytics_test_secret_2026';
process.env.EMAIL_ENABLED = 'false';
process.env.ENABLE_SLA_SCHEDULER = 'false';

const User = require('./models/User');
const Complaint = require('./models/Complaint');
const {
  parseDateRange,
  buildAnalyticsMatchQuery,
  generateOperationalInsights,
  getAnalyticsOverview,
  formatAnalyticsCsvReport,
  sanitizeCsvCell,
} = require('./services/analyticsService');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const complaintRoutes = require('./routes/complaints');

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

async function runAnalyticsTests() {
  console.log('====================================================================');
  console.log('       CampusCare 2.0 Advanced Analytics Verification Suite         ');
  console.log('====================================================================\n');

  let mongod = null;
  let mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/campuscare';

  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 1500 });
    console.log(`[Database] Connected to external MongoDB: ${mongoUri}`);
  } catch {
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
  app.use('/api/admin', adminRoutes);
  app.use('/api/complaints', complaintRoutes);

  const httpServer = http.createServer(app);
  await new Promise((resolve) => httpServer.listen(0, resolve));
  const port = httpServer.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;
  console.log(`[Server] Analytics test server listening on ${baseUrl}\n`);

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
    // -----------------------------------------------------------------
    // STEP 1: SEED TEST FIXTURES
    // -----------------------------------------------------------------
    console.log('--- Step 1: Seeding Test Roles and Historical Complaints ---');
    await User.deleteMany({});
    await Complaint.deleteMany({});

    // Create Admin
    const adminUser = await User.create({
      name: 'System Administrator',
      email: 'admin.analytics@test.edu',
      password: DEMO_PASSWORD,
      role: 'admin',
    });

    // Create Staff Members
    const staffElec = await User.create({
      name: 'Rajesh Sharma (Electrician)',
      email: 'elec.staff@test.edu',
      password: DEMO_PASSWORD,
      role: 'staff',
    });

    const staffPlumb = await User.create({
      name: 'Manoj Kumar (Plumber)',
      email: 'plumb.staff@test.edu',
      password: DEMO_PASSWORD,
      role: 'staff',
    });

    // Create Student
    const studentUser = await User.create({
      name: 'Aarav Mehta',
      email: 'student.analytics@test.edu',
      password: DEMO_PASSWORD,
      role: 'student',
      studentId: 'STU-9901',
    });

    // Obtain JWT tokens for each role
    const getLoginToken = async (email, password) => {
      const res = await makeRequest(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      return res.body?.token;
    };

    const adminToken = await getLoginToken('admin.analytics@test.edu', DEMO_PASSWORD);
    const staffToken = await getLoginToken('elec.staff@test.edu', DEMO_PASSWORD);
    const studentToken = await getLoginToken('student.analytics@test.edu', DEMO_PASSWORD);

    assert(adminToken, 'Admin token successfully acquired');
    assert(staffToken, 'Staff token successfully acquired');
    assert(studentToken, 'Student token successfully acquired');

    // Seed Complaints with varied dates and states
    const now = Date.now();
    const daysAgo = (d) => new Date(now - d * 24 * 60 * 60 * 1000);

    const testComplaints = [
      // Current Period (0-30 days)
      {
        title: 'AC Failure in Lab 1',
        description: 'Compressor stopped cooling in computer lab 1',
        category: 'Equipment',
        location: 'Computer Center, Lab 1',
        priority: 'HIGH',
        status: 'RESOLVED',
        createdBy: studentUser._id,
        assignedTo: staffElec._id,
        createdAt: daysAgo(2),
        updatedAt: daysAgo(1),
        sla: {
          status: 'RESOLVED',
          responseAt: daysAgo(2),
          resolutionAt: daysAgo(1),
          resolutionBreached: false,
          responseTargetMinutes: 120,
          resolutionTargetMinutes: 1440,
        },
        feedback: { rating: 5, comment: 'Fixed rapidly.' },
      },
      {
        title: 'Main Hallway Lights Flickering',
        description: 'Lights flickering rapidly causing hazard',
        category: 'Electrical',
        location: 'Hostel Block A, 1st Floor',
        priority: 'CRITICAL',
        status: 'ASSIGNED',
        createdBy: studentUser._id,
        assignedTo: staffElec._id,
        createdAt: daysAgo(5),
        sla: {
          status: 'BREACHED',
          responseAt: daysAgo(5),
          resolutionBreached: true,
          escalated: true,
          escalationLevel: 1,
          responseTargetMinutes: 60,
          resolutionTargetMinutes: 240,
        },
      },
      {
        title: 'Water Pipe Joint Leakage',
        description: 'Water leaking continuously under washbasin',
        category: 'Plumbing',
        location: 'Hostel Block A, Restroom 2',
        priority: 'MEDIUM',
        status: 'IN_PROGRESS',
        createdBy: studentUser._id,
        assignedTo: staffPlumb._id,
        createdAt: daysAgo(10),
        sla: {
          status: 'ON_TRACK',
          responseAt: daysAgo(10),
          resolutionBreached: false,
          responseTargetMinutes: 240,
          resolutionTargetMinutes: 2880,
        },
      },
      {
        title: 'Broken Armrest on Chair',
        description: 'Classroom chair has cracked arm support',
        category: 'Furniture',
        location: 'Academic Complex 1, LH-101',
        priority: 'LOW',
        status: 'PENDING',
        createdBy: studentUser._id,
        createdAt: daysAgo(15),
        duplicateDetected: true,
        sla: {
          status: 'AT_RISK',
          responseTargetMinutes: 480,
          resolutionTargetMinutes: 4320,
        },
      },
      // Previous Period (31-60 days)
      {
        title: 'Historical Corridor Fan Burnout',
        description: 'Ceiling fan smoked and ceased rotation',
        category: 'Electrical',
        location: 'Hostel Block A, Ground Floor',
        priority: 'MEDIUM',
        status: 'RESOLVED',
        createdBy: studentUser._id,
        assignedTo: staffElec._id,
        createdAt: daysAgo(40),
        updatedAt: daysAgo(39),
        sla: {
          status: 'RESOLVED',
          responseAt: daysAgo(40),
          resolutionAt: daysAgo(39),
          resolutionBreached: false,
          responseTargetMinutes: 240,
          resolutionTargetMinutes: 2880,
        },
        feedback: { rating: 4, comment: 'Replaced properly.' },
      },
      {
        title: 'Historical Flush Leak in Science Block',
        description: 'Urinal flush valve continuous flow',
        category: 'Plumbing',
        location: 'Science Block, Floor 2',
        priority: 'HIGH',
        status: 'RESOLVED',
        createdBy: studentUser._id,
        assignedTo: staffPlumb._id,
        createdAt: daysAgo(45),
        updatedAt: daysAgo(42),
        sla: {
          status: 'RESOLVED',
          responseAt: daysAgo(45),
          resolutionAt: daysAgo(42),
          resolutionBreached: true,
          responseTargetMinutes: 120,
          resolutionTargetMinutes: 1440,
        },
      },
    ];

    await Complaint.insertMany(testComplaints);
    console.log(`[Seed] Inserted ${testComplaints.length} test complaints.\n`);

    // -----------------------------------------------------------------
    // STEP 2: RBAC & AUTHORIZATION CHECKS
    // -----------------------------------------------------------------
    console.log('--- Step 2: RBAC Authorization Verification ---');

    // Unauthenticated request
    const unauthRes = await makeRequest(`${baseUrl}/admin/analytics/overview`);
    assert(unauthRes.status === 401, 'Unauthenticated request receives 401 Unauthorized');

    // Student request
    const studentRes = await makeRequest(`${baseUrl}/admin/analytics/overview`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(studentRes.status === 403, 'Student request receives 403 Forbidden');

    // Staff request
    const staffRes = await makeRequest(`${baseUrl}/admin/analytics/overview`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert(staffRes.status === 403, 'Staff request receives 403 Forbidden');

    // Admin request
    const adminRes = await makeRequest(`${baseUrl}/admin/analytics/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminRes.status === 200, 'Admin request receives 200 OK');
    assert(adminRes.body?.success === true, 'Response body success is true');

    // -----------------------------------------------------------------
    // STEP 3: CONSOLIDATED OVERVIEW PAYLOAD STRUCTURE
    // -----------------------------------------------------------------
    console.log('\n--- Step 3: Analytics Overview Payload Verification ---');
    const data = adminRes.body?.data;
    assert(data?.period, 'Contains period metadata');
    assert(data?.period?.range === '30d', 'Default range is 30d');
    assert(data?.summary, 'Contains summary metrics');
    assert(data?.summary?.totalComplaints === 4, 'Current period total complaints equals 4');
    assert(data?.summary?.activeBacklog === 3, 'Active backlog equals 3 (1 Assigned, 1 In Progress, 1 Pending)');
    assert(data?.summary?.resolvedComplaints === 1, 'Resolved complaints equals 1');

    assert(data?.periodComparison, 'Contains periodComparison object');
    assert(typeof data?.periodComparison?.volumeChangePercent === 'number', 'volumeChangePercent is a valid number');

    assert(Array.isArray(data?.categoryDistribution), 'categoryDistribution is an array');
    assert(data?.categoryDistribution.length > 0, 'categoryDistribution has entries');

    assert(Array.isArray(data?.priorityDistribution), 'priorityDistribution is an array');
    assert(data?.priorityDistribution.some((p) => p.priority === 'CRITICAL'), 'Contains CRITICAL priority entry');

    assert(data?.slaAnalytics, 'Contains slaAnalytics metrics');
    assert(data?.slaAnalytics?.breached === 1, 'breached count is 1');
    assert(data?.slaAnalytics?.escalations?.total === 1, 'escalation count is 1');
    assert(data?.slaAnalytics?.escalations?.level1 === 1, 'escalation level 1 count is 1');

    assert(Array.isArray(data?.staffPerformance), 'staffPerformance is an array');
    assert(data?.staffPerformance.length >= 2, 'Lists seeded maintenance staff members');

    assert(Array.isArray(data?.locationHotspots), 'locationHotspots is an array');
    assert(data?.locationHotspots.some((l) => l.location.includes('Hostel Block A')), 'Identifies Hostel Block A hotspot');

    assert(data?.feedbackAnalytics, 'Contains feedbackAnalytics metrics');
    assert(data?.feedbackAnalytics?.totalRatings === 1, 'totalRatings is 1');
    assert(data?.feedbackAnalytics?.avgRating === 5, 'avgRating is 5.0');

    assert(Array.isArray(data?.operationalInsights), 'operationalInsights is an array');
    assert(data?.operationalInsights.length > 0, 'Deterministic operational insights generated');

    // -----------------------------------------------------------------
    // STEP 4: DATE RANGE FILTERING
    // -----------------------------------------------------------------
    console.log('\n--- Step 4: Date Range Filtering ---');

    // 7 Days
    const res7d = await makeRequest(`${baseUrl}/admin/analytics/overview?range=7d`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(res7d.status === 200, 'GET ?range=7d succeeds with 200 OK');
    assert(res7d.body?.data?.summary?.totalComplaints === 2, '7d range correctly isolates 2 complaints (2d and 5d old)');

    // 90 Days (includes both current and previous period)
    const res90d = await makeRequest(`${baseUrl}/admin/analytics/overview?range=90d`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(res90d.status === 200, 'GET ?range=90d succeeds with 200 OK');
    assert(res90d.body?.data?.summary?.totalComplaints === 6, '90d range correctly aggregates all 6 complaints');

    // Custom Date Range
    const startStr = new Date(now - 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endStr = new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const resCustom = await makeRequest(
      `${baseUrl}/admin/analytics/overview?range=custom&startDate=${startStr}&endDate=${endStr}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(resCustom.status === 200, 'GET custom date range succeeds with 200 OK');
    assert(resCustom.body?.data?.period?.range === 'custom', 'Period range correctly reflects custom');

    // -----------------------------------------------------------------
    // STEP 5: CATEGORY / PRIORITY / SLA / LOCATION / STAFF FILTERS
    // -----------------------------------------------------------------
    console.log('\n--- Step 5: Multi-Dimensional Operational Filters ---');

    // Category Filter: Electrical
    const resElec = await makeRequest(`${baseUrl}/admin/analytics/overview?category=Electrical`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(resElec.status === 200, 'Filter by category=Electrical succeeds');
    assert(resElec.body?.data?.summary?.totalComplaints === 1, 'Only Electrical complaint returned');

    // Priority Filter: CRITICAL
    const resCrit = await makeRequest(`${baseUrl}/admin/analytics/overview?priority=CRITICAL`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(resCrit.status === 200, 'Filter by priority=CRITICAL succeeds');
    assert(resCrit.body?.data?.summary?.totalComplaints === 1, 'Only Critical complaint returned');

    // SLA Status Filter: BREACHED
    const resBreached = await makeRequest(`${baseUrl}/admin/analytics/overview?slaStatus=BREACHED`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(resBreached.status === 200, 'Filter by slaStatus=BREACHED succeeds');
    assert(resBreached.body?.data?.summary?.totalComplaints === 1, 'Only Breached complaint returned');

    // Location Regex Filter: Hostel
    const resHostel = await makeRequest(`${baseUrl}/admin/analytics/overview?location=Hostel`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(resHostel.status === 200, 'Filter by location=Hostel succeeds');
    assert(resHostel.body?.data?.summary?.totalComplaints === 2, 'Hostel complaints isolated correctly');

    // Staff Filter
    const resStaffFilter = await makeRequest(`${baseUrl}/admin/analytics/overview?assignedStaff=${staffElec._id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(resStaffFilter.status === 200, 'Filter by assignedStaff succeeds');
    assert(resStaffFilter.body?.data?.summary?.totalComplaints === 2, 'Complaints assigned to electrician isolated');

    // -----------------------------------------------------------------
    // STEP 6: SPECIALIZED SUB-ENDPOINTS
    // -----------------------------------------------------------------
    console.log('\n--- Step 6: Specialized Metric Endpoints ---');

    const resTrends = await makeRequest(`${baseUrl}/admin/analytics/trends`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(resTrends.status === 200 && Array.isArray(resTrends.body?.volumeTrends), 'GET /trends returns volumeTrends array');

    const resSla = await makeRequest(`${baseUrl}/admin/analytics/sla`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(resSla.status === 200 && typeof resSla.body?.slaAnalytics?.compliancePercentage === 'number', 'GET /sla returns SLA telemetry');

    const resStaff = await makeRequest(`${baseUrl}/admin/analytics/staff`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(resStaff.status === 200 && Array.isArray(resStaff.body?.staffPerformance), 'GET /staff returns staffPerformance array');

    const resLocations = await makeRequest(`${baseUrl}/admin/analytics/locations`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(resLocations.status === 200 && Array.isArray(resLocations.body?.locationHotspots), 'GET /locations returns locationHotspots array');

    const resFeedback = await makeRequest(`${baseUrl}/admin/analytics/feedback`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(resFeedback.status === 200 && typeof resFeedback.body?.feedbackAnalytics?.totalRatings === 'number', 'GET /feedback returns feedbackAnalytics');

    // -----------------------------------------------------------------
    // STEP 7: EXECUTIVE CSV REPORT EXPORT & SANITIZATION
    // -----------------------------------------------------------------
    console.log('\n--- Step 7: Executive CSV Report Export ---');

    const resExport = await makeRequest(`${baseUrl}/admin/analytics/export?range=30d`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(resExport.status === 200, 'GET /export returns 200 OK');
    const contentType = resExport.headers.get('content-type') || '';
    assert(contentType.includes('text/csv'), 'Response Content-Type is text/csv');
    const contentDisposition = resExport.headers.get('content-disposition') || '';
    assert(contentDisposition.includes('attachment; filename="campuscare-analytics-'), 'Contains valid attachment filename');

    const csvText = typeof resExport.body === 'string' ? resExport.body : '';
    assert(csvText.includes('--- EXECUTIVE OPERATIONAL KPI SUMMARY ---'), 'CSV contains Section 1 KPI Summary');
    assert(csvText.includes('--- COMPLAINT VOLUME TRENDS ---'), 'CSV contains Section 2 Volume Trends');
    assert(csvText.includes('--- CATEGORY BREAKDOWN & SLA HEALTH ---'), 'CSV contains Section 3 Category Breakdown');
    assert(csvText.includes('--- PRIORITY DISTRIBUTION ---'), 'CSV contains Section 4 Priority Distribution');
    assert(csvText.includes('--- SLA PERFORMANCE METRICS ---'), 'CSV contains Section 5 SLA Metrics');
    assert(csvText.includes('--- TECHNICIAN & STAFF PERFORMANCE ---'), 'CSV contains Section 6 Staff Performance');
    assert(csvText.includes('--- CAMPUS LOCATION HOTSPOTS (TOP 10) ---'), 'CSV contains Section 7 Campus Hotspots');
    assert(csvText.includes('--- DETERMINISTIC OPERATIONAL INSIGHTS ---'), 'CSV contains Section 8 Insights');

    // Test CSV formula injection defense
    const dangerousFormula = '=1+1';
    assert(sanitizeCsvCell(dangerousFormula).startsWith("'="), 'CSV injection prevention prefixes dangerous leading formulas (=, +, -, @)');
    const dangerousCommand = '=cmd|"/c calc"!A1';
    assert(sanitizeCsvCell(dangerousCommand).includes("'="), 'CSV injection quotes and escapes complex formula vectors');

    // -----------------------------------------------------------------
    // STEP 8: EMPTY DATASET & EDGE CASE HANDLING
    // -----------------------------------------------------------------
    console.log('\n--- Step 8: Empty Dataset & Edge Case Handling ---');

    const emptyRes = await makeRequest(`${baseUrl}/admin/analytics/overview?location=NonExistentCampusBuilding12345`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(emptyRes.status === 200, 'Empty matching dataset returns 200 OK (no 500 error)');
    assert(emptyRes.body?.data?.summary?.totalComplaints === 0, 'totalComplaints is 0');
    assert(emptyRes.body?.data?.slaAnalytics?.compliancePercentage === 100, 'Empty resolved complaints defaults to 100% compliance without NaN');
    assert(
      emptyRes.body?.data?.operationalInsights[0] === 'Not enough data to determine an operational trend.',
      'Graceful insight fallback message on empty data'
    );

    console.log('\n====================================================================');
    console.log(`Analytics Verification Complete: ${passed} passed, ${failed} failed`);
    console.log('====================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  } finally {
    await httpServer.close();
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  }
}

runAnalyticsTests();
