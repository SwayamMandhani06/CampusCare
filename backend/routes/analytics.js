/**
 * Analytics Routes
 * Admin-only operations for operational dashboards, trends, and CSV reports.
 */
const express = require('express');
const router = express.Router();
const {
  getOverview,
  getTrends,
  getSla,
  getStaff,
  getLocations,
  getFeedback,
  exportReport,
} = require('../controllers/analyticsController');

// Consolidated Analytics Overview (supports ?range=, ?startDate=, ?endDate=, ?category=, etc.)
router.get('/', getOverview);
router.get('/overview', getOverview);

// Specialized Metric Endpoints
router.get('/trends', getTrends);
router.get('/sla', getSla);
router.get('/staff', getStaff);
router.get('/locations', getLocations);
router.get('/feedback', getFeedback);

// Export Executive CSV Report
router.get('/export', exportReport);

module.exports = router;
