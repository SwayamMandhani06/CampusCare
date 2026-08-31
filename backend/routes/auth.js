/**
 * Authentication Routes
 * Maps /api/auth endpoints to controller actions
 */
const express = require('express');
const router = express.Router();

const {
  registerUser,
  loginUser,
  getMe,
} = require('../controllers/authController');

const { protect } = require('../middleware/auth');

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// Protected routes (require valid JWT bearer token)
router.get('/me', protect, getMe);

module.exports = router;
