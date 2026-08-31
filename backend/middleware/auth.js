/**
 * Authentication & Authorization Middleware
 * Protects endpoints and implements Role-Based Access Control (RBAC)
 */
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Protect Middleware
 * Verifies JWT bearer token from Authorization header and attaches the user document to req.user
 */
const protect = async (req, res, next) => {
  let token;

  // Check if authorization header is provided with 'Bearer' scheme
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Extract token from "Bearer <token>"
      token = req.headers.authorization.split(' ')[1];

      // Verify token signature and decode payload
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Fetch user from DB excluding the password field
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Not authorized: User belonging to this token no longer exists',
        });
      }

      next();
    } catch (error) {
      console.error(`[Auth Middleware Error] ${error.message}`);
      return res.status(401).json({
        success: false,
        message: 'Not authorized: Invalid or expired token',
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized: No Bearer token provided in Authorization header',
    });
  }
};

/**
 * Authorize Middleware Factory
 * Restricts route access to specified roles
 * @param  {...string} roles - Allowed roles (e.g. 'admin', 'staff')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: User role '${req.user ? req.user.role : 'anonymous'}' is not authorized to access this resource`,
      });
    }
    next();
  };
};

module.exports = {
  protect,
  authorize,
};
