/**
 * Complaint Routes
 * All routes are protected by the JWT protect middleware.
 */
const express = require('express');
const router = express.Router();

const {
  createComplaint,
  getMyComplaints,
  getComplaintById,
  updateComplaint,
  getComplaintImage,
  addComment,
  getComments,
  submitFeedback,
  exportMyComplaintsCsv,
} = require('../controllers/complaintController');

const { protect } = require('../middleware/auth');
const { complaintUploadMiddleware } = require('../utils/upload');

// All complaint routes require being logged in
router.use(protect);

// CSV Export (Must be placed before /:id)
router.get('/export', exportMyComplaintsCsv);

router
  .route('/')
  .post(complaintUploadMiddleware, createComplaint)
  .get(getMyComplaints);

// Discussion Comments
router
  .route('/:id/comments')
  .post(addComment)
  .get(getComments);

// Resolution Feedback / Rating
router.post('/:id/feedback', submitFeedback);

// Secure Image Retrieval
router.get('/:id/images/:imageId', getComplaintImage);

router
  .route('/:id')
  .get(getComplaintById)
  .put(updateComplaint);

module.exports = router;
