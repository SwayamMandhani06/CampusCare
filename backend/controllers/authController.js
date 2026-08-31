/**
 * Authentication Controller
 * Contains route handler logic for user registration, login, and profile fetching
 */
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Generate a signed JWT token
 * @param {string} id - The MongoDB user _id
 * @param {string} role - The user's role (student, admin, staff)
 * @returns {string} - Signed JWT token valid for 7 days
 */
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerUser = async (req, res) => {
  try {
    const { name, email, password, studentId, role } = req.body;

    // Validate mandatory fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password',
      });
    }

    // Check if user already exists with the given email
    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email address already exists',
      });
    }

    // Prepare user creation data
    // Defaults to 'student' if not specified; allows role assignment for dev/FA evaluation
    const userData = {
      name,
      email: email.toLowerCase(),
      password,
      role: role || 'student',
    };

    if (studentId) {
      userData.studentId = studentId;
    }

    // Create user (password will be hashed by pre-save hook in User model)
    const user = await User.create(userData);

    // Generate JWT token containing user id and role
    const token = generateToken(user._id, user.role);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error(`[Register Error] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message,
    });
  }
};

/**
 * @desc    Authenticate user & get JWT token
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate inputs
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Find user by email and explicitly include password field (which is select: false)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials: No account found with this email',
      });
    }

    // Verify password with bcrypt
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials: Password does not match',
      });
    }

    // Generate JWT token containing id and role
    const token = generateToken(user._id, user.role);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error(`[Login Error] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message,
    });
  }
};

/**
 * @desc    Get currently logged-in user profile
 * @route   GET /api/auth/me
 * @access  Private (Protected by JWT)
 */
const getMe = async (req, res) => {
  try {
    // req.user is already populated by the 'protect' middleware (excluding password)
    return res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    console.error(`[GetMe Error] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving profile',
      error: error.message,
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
};
