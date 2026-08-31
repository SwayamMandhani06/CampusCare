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
} = require('../controllers/complaintController');

const { protect } = require('../middleware/auth');

// All complaint routes require being logged in
router.use(protect);

router.route('/')
  .post(createComplaint)
  .get(getMyComplaints);

router.route('/:id')
  .get(getComplaintById)
  .put(updateComplaint);

module.exports = router;
