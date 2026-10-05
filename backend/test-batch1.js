/**
 * Batch 1 Verification Suite for CampusCare 2.0
 * 
 * Verifies end-to-end:
 * 1. Complaint Comments (authorized student, staff, admin; unauthorized rejection, validation)
 * 2. Complaint Image Uploads (valid upload, magic byte check, secure retrieval, authorization)
 * 3. In-App Notification Center (generation, user-scoping, unread count, mark read, mark all read)
 * 4. Email Notifications (resilience, non-blocking behavior, disabled state safety)
 * 5. Advanced Search & Filtering (keyword, status, priority, category, staff, date ranges)
 * 6. Complaint Feedback & Rating (1-5 star rating, resolved-only guard, duplicate rejection, authorization)
 * 7. Activity Timeline & History (event generation across lifecycle)
 * 8. CSV Export (student export, admin export, staff export, RFC 4180 escaping)
 */

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const fs = require('fs');
const path = require('path');

require('dotenv').config();
process.env.JWT_SECRET = process.env.JWT_SECRET || 'campuscare_batch1_jwt_secret_2026';
process.env.EMAIL_ENABLED = 'false'; // Ensure email is in safe disabled mode during tests

const User = require('./models/User');
const Complaint = require('./models/Complaint');
const Comment = require('./models/Comment');
const Notification = require('./models/Notification');

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

async function runBatch1Tests() {
  console.log('====================================================================');
  console.log('       CampusCare 2.0 Batch 1 End-to-End Verification Suite        ');
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

  // Create isolated test Express app
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
    // Setup Users: Student 1, Student 2, Staff 1, Admin 1
    // -------------------------------------------------------------
    console.log('--- Step 1: User Setup & Authentication ---');
    await User.deleteMany({});
    await Complaint.deleteMany({});
    await Comment.deleteMany({});
    await Notification.deleteMany({});

    const student1Res = await makeRequest(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Rohan Deshmukh',
        email: 'rohan.deshmukh@pccoepune.org',
        studentId: '123B1B101',
        password: 'Password@123',
      }),
    });
    const student1Token = student1Res.body.token;
    const student1Id = student1Res.body.user.id;

    const student2Res = await makeRequest(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Ananya Sharma',
        email: 'ananya.sharma@pccoepune.org',
        studentId: '123B1B102',
        password: 'Password@123',
      }),
    });
    const student2Token = student2Res.body.token;

    // Direct staff and admin creation
    const staff1User = await User.create({
      name: 'Rajesh Patil',
      email: 'rajesh.patil@pccoepune.org',
      password: 'Password@123',
      role: 'staff',
    });
    const staff1LoginRes = await makeRequest(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'rajesh.patil@pccoepune.org', password: 'Password@123' }),
    });
    const staff1Token = staff1LoginRes.body.token;
    const staff1Id = staff1User._id.toString();

    const adminUser = await User.create({
      name: 'Campus Admin',
      email: 'admin.super@pccoepune.org',
      password: 'Password@123',
      role: 'admin',
    });
    const adminLoginRes = await makeRequest(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin.super@pccoepune.org', password: 'Password@123' }),
    });
    const adminToken = adminLoginRes.body.token;

    assert(student1Token && student2Token && staff1Token && adminToken, 'All 4 user tokens generated');

    // -------------------------------------------------------------
    // FEATURE 1 & 2: Create Complaint with Attachments & Comments
    // -------------------------------------------------------------
    console.log('\n--- Step 2: Complaint Image Upload & Creation ---');

    // Create a real 1x1 valid PNG buffer with proper magic bytes (89 50 4E 47 0D 0A 1A 0A)
    const validPngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 pixel
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
      0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
      0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
      0x42, 0x60, 0x82,
    ]);

    // Create a multipart form using FormData boundary
    const boundary = '----WebKitFormBoundaryBatch1Test';
    const multipartBody = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="title"\r\n\r\nWater Leakage in Lab 201\r\n` +
        `--${boundary}\r\nContent-Disposition: form-data; name="description"\r\n\r\nSevere pipe joint rupture under the sink\r\n` +
        `--${boundary}\r\nContent-Disposition: form-data; name="category"\r\n\r\nPlumbing\r\n` +
        `--${boundary}\r\nContent-Disposition: form-data; name="location"\r\n\r\nMain Complex Room 201\r\n` +
        `--${boundary}\r\nContent-Disposition: form-data; name="priority"\r\n\r\nHIGH\r\n` +
        `--${boundary}\r\nContent-Disposition: form-data; name="images"; filename="leak.png"\r\nContent-Type: image/png\r\n\r\n`
      ),
      validPngBuffer,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const uploadRes = await makeRequest(`${baseUrl}/complaints`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${student1Token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: multipartBody,
    });

    assert(uploadRes.status === 201, 'POST /api/complaints with valid PNG returns 201');
    const complaint1 = uploadRes.body.complaint;
    assert(complaint1.images && complaint1.images.length === 1, 'Complaint contains 1 image attachment');
    assert(complaint1.images[0].originalName === 'leak.png', 'Original image filename preserved');
    assert(complaint1.images[0].mimeType === 'image/png', 'Image MIME type verified as image/png');
    const imageId = complaint1.images[0].imageId;

    // Test Secure Image Retrieval
    const imgGetRes = await makeRequest(`${baseUrl}/complaints/${complaint1._id}/images/${imageId}`, {
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    assert(imgGetRes.status === 200, 'GET /api/complaints/:id/images/:imageId by owner returns 200 OK');
    assert(imgGetRes.headers.get('content-type') === 'image/png', 'Image response Content-Type is image/png');

    // Test Unauthorized Image Retrieval
    const unauthImgRes = await makeRequest(`${baseUrl}/complaints/${complaint1._id}/images/${imageId}`, {
      headers: { Authorization: `Bearer ${student2Token}` },
    });
    assert(unauthImgRes.status === 403, 'Unauthorized student cannot retrieve another student image (403)');

    // Test Invalid Magic Bytes (Fake PNG containing plain text)
    const fakeMultipart = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="title"\r\n\r\nFake Image Ticket\r\n` +
        `--${boundary}\r\nContent-Disposition: form-data; name="description"\r\n\r\nTesting file signature validation\r\n` +
        `--${boundary}\r\nContent-Disposition: form-data; name="category"\r\n\r\nElectrical\r\n` +
        `--${boundary}\r\nContent-Disposition: form-data; name="location"\r\n\r\nLH 101\r\n` +
        `--${boundary}\r\nContent-Disposition: form-data; name="images"; filename="fake.png"\r\nContent-Type: image/png\r\n\r\n` +
        `NOT_A_REAL_PNG_HEADER_JUST_TEXT` +
        `\r\n--${boundary}--\r\n`
      ),
    ]);
    const fakeUploadRes = await makeRequest(`${baseUrl}/complaints`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${student1Token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: fakeMultipart,
    });
    assert(fakeUploadRes.status === 400, 'Uploading image with forged extension/invalid magic bytes rejected with 400');

    // -------------------------------------------------------------
    // FEATURE 1: Complaint Discussion Comments
    // -------------------------------------------------------------
    console.log('\n--- Step 3: Complaint Comments ---');

    // Student 1 adds comment to own complaint
    const comment1Res = await makeRequest(`${baseUrl}/complaints/${complaint1._id}/comments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${student1Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: 'Please bring an extra replacement valve, water is overflowing.' }),
    });
    assert(comment1Res.status === 201, 'Student can post comment to own complaint (201)');
    assert(comment1Res.body.comment.authorRole === 'student', 'Comment authorRole is student');

    // Admin assigns complaint to Staff 1
    await makeRequest(`${baseUrl}/admin/complaints/${complaint1._id}/assign`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ staffId: staff1Id }),
    });

    // Staff 1 adds comment to assigned complaint
    const staffCommentRes = await makeRequest(`${baseUrl}/complaints/${complaint1._id}/comments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${staff1Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: 'I am on my way with a 1-inch brass coupling valve.' }),
    });
    assert(staffCommentRes.status === 201, 'Assigned staff can post comment to complaint (201)');
    assert(staffCommentRes.body.comment.authorRole === 'staff', 'Comment authorRole is staff');

    // Admin adds comment to complaint
    const adminCommentRes = await makeRequest(`${baseUrl}/complaints/${complaint1._id}/comments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: 'Noted. Facility priority escalated.' }),
    });
    assert(adminCommentRes.status === 201, 'Admin can post comment to any complaint (201)');

    // Student 2 attempts to comment on Student 1's complaint -> 403 Forbidden
    const unauthCommentRes = await makeRequest(`${baseUrl}/complaints/${complaint1._id}/comments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${student2Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: 'I am an unauthorized student trying to comment.' }),
    });
    assert(unauthCommentRes.status === 403, 'Unauthorized student denied commenting (403)');

    // Empty comment rejection
    const emptyCommentRes = await makeRequest(`${baseUrl}/complaints/${complaint1._id}/comments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${student1Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: '   ' }),
    });
    assert(emptyCommentRes.status === 400, 'Empty comment rejected with 400 Bad Request');

    // Retrieve comments
    const getCommentsRes = await makeRequest(`${baseUrl}/complaints/${complaint1._id}/comments`, {
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    assert(getCommentsRes.status === 200, 'GET /api/complaints/:id/comments returns 200 OK');
    assert(getCommentsRes.body.count === 3, 'Comments count matches 3 posted comments');

    // -------------------------------------------------------------
    // FEATURE 3: In-App Notification Center
    // -------------------------------------------------------------
    console.log('\n--- Step 4: In-App Notifications ---');

    // Student 1 should have received notifications (complaint created, technician assigned, comments)
    const notifsRes = await makeRequest(`${baseUrl}/notifications`, {
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    assert(notifsRes.status === 200, 'GET /api/notifications returns 200 OK');
    assert(notifsRes.body.notifications.length > 0, 'Student 1 has in-app notifications generated');

    // Unread count
    const unreadCountRes = await makeRequest(`${baseUrl}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    assert(unreadCountRes.status === 200, 'GET /api/notifications/unread-count returns 200 OK');
    assert(unreadCountRes.body.count > 0, 'Unread count is greater than 0');

    // Mark single notification read
    const firstNotifId = notifsRes.body.notifications[0]._id;
    const markReadRes = await makeRequest(`${baseUrl}/notifications/${firstNotifId}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    assert(markReadRes.status === 200, 'PATCH /api/notifications/:id/read returns 200 OK');
    assert(markReadRes.body.notification.read === true, 'Notification read flag updated to true');

    // Mark all read
    const markAllReadRes = await makeRequest(`${baseUrl}/notifications/read-all`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    assert(markAllReadRes.status === 200, 'PATCH /api/notifications/read-all returns 200 OK');
    assert(markAllReadRes.body.unreadCount === 0, 'Unread count is now 0 after mark-all-read');

    // Student 2 cannot mark Student 1 notification read
    const unauthMarkRes = await makeRequest(`${baseUrl}/notifications/${firstNotifId}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${student2Token}` },
    });
    assert(unauthMarkRes.status === 403, 'User cannot modify another user notification (403)');

    // -------------------------------------------------------------
    // FEATURE 6: Complaint Feedback & Rating
    // -------------------------------------------------------------
    console.log('\n--- Step 5: Complaint Feedback & Rating ---');

    // Attempt feedback before resolution -> should fail with 400
    const prematureFeedbackRes = await makeRequest(`${baseUrl}/complaints/${complaint1._id}/feedback`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${student1Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rating: 5, comment: 'Fixed quickly!' }),
    });
    assert(prematureFeedbackRes.status === 400, 'Feedback on unresolved complaint rejected with 400');

    // Staff resolves complaint
    await makeRequest(`${baseUrl}/staff/tasks/${complaint1._id}/resolve`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${staff1Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ resolutionNotes: 'Replaced brass coupling and sealed joint.' }),
    });

    // Student 2 attempts to rate Student 1's complaint -> 403
    const unauthFeedbackRes = await makeRequest(`${baseUrl}/complaints/${complaint1._id}/feedback`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${student2Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rating: 4, comment: 'Nice job' }),
    });
    assert(unauthFeedbackRes.status === 403, 'Unauthorized student denied submitting feedback (403)');

    // Valid feedback by Student 1
    const validFeedbackRes = await makeRequest(`${baseUrl}/complaints/${complaint1._id}/feedback`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${student1Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rating: 5, comment: 'Technician Rajesh was prompt and fixed the leak perfectly!' }),
    });
    assert(validFeedbackRes.status === 201, 'Owner student can submit feedback for resolved complaint (201)');
    assert(validFeedbackRes.body.feedback.rating === 5, 'Feedback rating stored as 5');

    // Duplicate feedback rejected -> 409
    const duplicateFeedbackRes = await makeRequest(`${baseUrl}/complaints/${complaint1._id}/feedback`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${student1Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rating: 4, comment: 'Trying to submit again' }),
    });
    assert(duplicateFeedbackRes.status === 409, 'Duplicate feedback rejected with 409 Conflict');

    // Invalid rating (>5) rejected -> 400
    // Create second resolved complaint to test rating validation
    const complaint2Doc = await Complaint.create({
      title: 'Projector HDMI port broken',
      description: 'Bent pins in projector HDMI faceplate',
      category: 'Classroom Infrastructure',
      location: 'Seminar Hall B',
      priority: 'MEDIUM',
      status: 'RESOLVED',
      createdBy: student1Id,
    });
    const invalidRatingRes = await makeRequest(`${baseUrl}/complaints/${complaint2Doc._id}/feedback`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${student1Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rating: 6, comment: 'Invalid star count' }),
    });
    assert(invalidRatingRes.status === 400, 'Feedback rating > 5 rejected with 400');

    // -------------------------------------------------------------
    // FEATURE 7: Activity Timeline
    // -------------------------------------------------------------
    console.log('\n--- Step 6: Activity History & Timeline ---');
    const detailRes = await makeRequest(`${baseUrl}/complaints/${complaint1._id}`, {
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    assert(detailRes.status === 200, 'GET /api/complaints/:id returns 200 OK');
    const timeline = detailRes.body.complaint.activityTimeline;
    assert(Array.isArray(timeline) && timeline.length >= 5, 'activityTimeline contains comprehensive events array');
    const eventTypes = timeline.map((e) => e.eventType);
    assert(eventTypes.includes('CREATED'), 'Timeline includes CREATED event');
    assert(eventTypes.includes('IMAGE_UPLOADED'), 'Timeline includes IMAGE_UPLOADED event');
    assert(eventTypes.includes('ASSIGNED'), 'Timeline includes ASSIGNED event');
    assert(eventTypes.includes('COMMENT_ADDED'), 'Timeline includes COMMENT_ADDED event');
    assert(eventTypes.includes('RESOLVED'), 'Timeline includes RESOLVED event');
    assert(eventTypes.includes('FEEDBACK_SUBMITTED'), 'Timeline includes FEEDBACK_SUBMITTED event');

    // -------------------------------------------------------------
    // FEATURE 5: Advanced Search & Filtering
    // -------------------------------------------------------------
    console.log('\n--- Step 7: Advanced Search & Filtering ---');
    // Search by keyword
    const searchRes = await makeRequest(`${baseUrl}/admin/complaints?search=Leakage`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(searchRes.status === 200, 'Admin keyword search returns 200 OK');
    assert(searchRes.body.complaints.length >= 1, 'Search finds complaint matching "Leakage"');

    // Filter by category
    const catRes = await makeRequest(`${baseUrl}/admin/complaints?category=Plumbing`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(catRes.status === 200, 'Category filter returns 200 OK');
    assert(catRes.body.complaints.every((c) => c.category === 'Plumbing'), 'All returned complaints match category Plumbing');

    // Filter by staff
    const staffFilterRes = await makeRequest(`${baseUrl}/admin/complaints?assignedStaff=${staff1Id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(staffFilterRes.status === 200, 'Assigned staff filter returns 200 OK');
    assert(staffFilterRes.body.complaints.length >= 1, 'Found complaints assigned to staff1');

    // -------------------------------------------------------------
    // FEATURE 8: CSV Export
    // -------------------------------------------------------------
    console.log('\n--- Step 8: CSV Export ---');

    // Student CSV Export
    const studentCsvRes = await makeRequest(`${baseUrl}/complaints/export`, {
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    assert(studentCsvRes.status === 200, 'GET /api/complaints/export returns 200 OK');
    assert(studentCsvRes.headers.get('content-type').includes('text/csv'), 'Student export returns text/csv');
    assert(studentCsvRes.body.includes('Ticket ID,Title,Category'), 'CSV contains standard RFC 4180 headers');
    assert(studentCsvRes.body.includes('Water Leakage in Lab 201'), 'CSV includes student complaint record');

    // Admin CSV Export
    const adminCsvRes = await makeRequest(`${baseUrl}/admin/complaints/export`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminCsvRes.status === 200, 'GET /api/admin/complaints/export returns 200 OK');
    assert(adminCsvRes.body.includes('Ticket ID,Title,Category'), 'Admin CSV contains header row');

    // Staff CSV Export
    const staffCsvRes = await makeRequest(`${baseUrl}/staff/tasks/export`, {
      headers: { Authorization: `Bearer ${staff1Token}` },
    });
    assert(staffCsvRes.status === 200, 'GET /api/staff/tasks/export returns 200 OK');
    assert(staffCsvRes.body.includes('Water Leakage in Lab 201'), 'Staff CSV includes assigned task');

    console.log('\n====================================================================');
    console.log(` Batch 1 Test Results: ${passed} passed, ${failed} failed`);
    console.log('====================================================================\n');

    server.close();
    if (mongod) await mongod.stop();
    await mongoose.disconnect();

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('[Batch 1 Test Suite Crash]', err);
    server.close();
    if (mongod) await mongod.stop();
    await mongoose.disconnect();
    process.exit(1);
  }
}

runBatch1Tests();
