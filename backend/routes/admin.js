/**
 * Admin Routes
 * Protected with protect and authorize('admin')
 */
const express = require('express');
const router = express.Router();

const {
  getAdminDashboard,
  getAllComplaints,
  assignStaff,
  updateComplaintStatus,
  updateComplaintPriority,
  getStaffRecommendations,
  reclassifyComplaint,
  getAllUsers,
  exportAdminComplaintsCsv,
} = require('../controllers/adminController');

const { protect, authorize } = require('../middleware/auth');

// Apply protect and admin authorization to all routes in this module
router.use(protect);
router.use(authorize('admin'));

router.get('/dashboard', getAdminDashboard);
router.use('/analytics', require('./analytics'));
router.get('/complaints/export', exportAdminComplaintsCsv);
router.get('/complaints', getAllComplaints);
router.put('/complaints/:id/assign', assignStaff);
router.put('/complaints/:id/status', updateComplaintStatus);
router.put('/complaints/:id/priority', updateComplaintPriority);
router.get('/complaints/:id/staff-recommendations', getStaffRecommendations);
router.post('/complaints/:id/reclassify', reclassifyComplaint);
router.get('/users', getAllUsers);

module.exports = router;
