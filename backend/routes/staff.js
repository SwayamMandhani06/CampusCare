/**
 * Staff Routes
 * Protected with protect and authorize('staff')
 */
const express = require('express');
const router = express.Router();

const {
  getStaffTasks,
  updateTaskStatus,
  resolveTask,
} = require('../controllers/staffController');

const { protect, authorize } = require('../middleware/auth');

// Protect all routes with JWT and require staff role
router.use(protect);
router.use(authorize('staff'));

router.get('/tasks', getStaffTasks);
router.put('/tasks/:id/status', updateTaskStatus);
router.put('/tasks/:id/resolve', resolveTask);

module.exports = router;
