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
  getAllUsers,
} = require('../controllers/adminController');

const { protect, authorize } = require('../middleware/auth');

// Apply protect and admin authorization to all routes in this module
router.use(protect);
router.use(authorize('admin'));

router.get('/dashboard', getAdminDashboard);
router.get('/complaints', getAllComplaints);
router.put('/complaints/:id/assign', assignStaff);
router.put('/complaints/:id/status', updateComplaintStatus);
router.get('/users', getAllUsers);

module.exports = router;
