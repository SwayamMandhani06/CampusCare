/**
 * Analytics Controller
 * Handles administrative operational analytics, trend reports, and CSV export.
 */
const {
  getAnalyticsOverview,
  formatAnalyticsCsvReport,
} = require('../services/analyticsService');

/**
 * @desc    Get consolidated analytics overview dataset
 * @route   GET /api/admin/analytics/overview or GET /api/admin/analytics
 * @access  Private (Admin only)
 */
const getOverview = async (req, res) => {
  try {
    const data = await getAnalyticsOverview(req.query);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(`[Analytics Error: Overview] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to aggregate analytics overview metrics',
      error: error.message,
    });
  }
};

/**
 * @desc    Get volume trends over time
 * @route   GET /api/admin/analytics/trends
 * @access  Private (Admin only)
 */
const getTrends = async (req, res) => {
  try {
    const data = await getAnalyticsOverview(req.query);
    return res.status(200).json({
      success: true,
      period: data.period,
      volumeTrends: data.volumeTrends,
    });
  } catch (error) {
    console.error(`[Analytics Error: Trends] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to aggregate volume trends',
      error: error.message,
    });
  }
};

/**
 * @desc    Get SLA compliance and escalation metrics
 * @route   GET /api/admin/analytics/sla
 * @access  Private (Admin only)
 */
const getSla = async (req, res) => {
  try {
    const data = await getAnalyticsOverview(req.query);
    return res.status(200).json({
      success: true,
      period: data.period,
      slaAnalytics: data.slaAnalytics,
    });
  } catch (error) {
    console.error(`[Analytics Error: SLA] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to aggregate SLA telemetry',
      error: error.message,
    });
  }
};

/**
 * @desc    Get staff performance and capacity breakdown
 * @route   GET /api/admin/analytics/staff
 * @access  Private (Admin only)
 */
const getStaff = async (req, res) => {
  try {
    const data = await getAnalyticsOverview(req.query);
    return res.status(200).json({
      success: true,
      period: data.period,
      staffPerformance: data.staffPerformance,
    });
  } catch (error) {
    console.error(`[Analytics Error: Staff] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to aggregate staff performance',
      error: error.message,
    });
  }
};

/**
 * @desc    Get campus facility location hotspots
 * @route   GET /api/admin/analytics/locations
 * @access  Private (Admin only)
 */
const getLocations = async (req, res) => {
  try {
    const data = await getAnalyticsOverview(req.query);
    return res.status(200).json({
      success: true,
      period: data.period,
      locationHotspots: data.locationHotspots,
    });
  } catch (error) {
    console.error(`[Analytics Error: Locations] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to aggregate location hotspots',
      error: error.message,
    });
  }
};

/**
 * @desc    Get student feedback and satisfaction analytics
 * @route   GET /api/admin/analytics/feedback
 * @access  Private (Admin only)
 */
const getFeedback = async (req, res) => {
  try {
    const data = await getAnalyticsOverview(req.query);
    return res.status(200).json({
      success: true,
      period: data.period,
      feedbackAnalytics: data.feedbackAnalytics,
    });
  } catch (error) {
    console.error(`[Analytics Error: Feedback] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to aggregate feedback analytics',
      error: error.message,
    });
  }
};

/**
 * @desc    Export structured executive analytics report to CSV
 * @route   GET /api/admin/analytics/export
 * @access  Private (Admin only)
 */
const exportReport = async (req, res) => {
  try {
    const data = await getAnalyticsOverview(req.query);
    const csvContent = formatAnalyticsCsvReport(data);

    const safeRange = (data.period.range || 'report').replace(/[^a-zA-Z0-9_-]/g, '');
    const dateStamp = new Date().toISOString().split('T')[0];
    const filename = `campuscare-analytics-${safeRange}-${dateStamp}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error(`[Analytics Error: Export] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate analytics CSV report',
      error: error.message,
    });
  }
};

module.exports = {
  getOverview,
  getTrends,
  getSla,
  getStaff,
  getLocations,
  getFeedback,
  exportReport,
};
