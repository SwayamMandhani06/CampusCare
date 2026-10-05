/**
 * Notification Controller
 * Manages user in-app notifications and unread badges.
 */
const Notification = require('../models/Notification');

/**
 * @desc    Get user notifications with pagination
 * @route   GET /api/notifications
 * @access  Private (Logged-in user)
 */
const getMyNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;

    const query = { recipient: req.user._id };
    if (unreadOnly === 'true') {
      query.read = false;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [total, unreadCount, notifications] = await Promise.all([
      Notification.countDocuments(query),
      Notification.countDocuments({ recipient: req.user._id, read: false }),
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('complaintId', 'title status category priority'),
    ]);

    return res.status(200).json({
      success: true,
      unreadCount,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
      notifications,
    });
  } catch (error) {
    console.error(`[Get Notifications Error] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving notifications',
      error: error.message,
    });
  }
};

/**
 * @desc    Get unread notification count
 * @route   GET /api/notifications/unread-count
 * @access  Private (Logged-in user)
 */
const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user._id,
      read: false,
    });

    return res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    console.error(`[Get Unread Count Error] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving unread count',
      error: error.message,
    });
  }
};

/**
 * @desc    Mark single notification as read
 * @route   PATCH /api/notifications/:id/read
 * @access  Private (Owner user only)
 */
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot modify notifications belonging to another user',
      });
    }

    notification.read = true;
    await notification.save();

    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      read: false,
    });

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      notification,
      unreadCount,
    });
  } catch (error) {
    console.error(`[Mark Notification Read Error] ${error.message}`);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification ID format',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Server error marking notification as read',
      error: error.message,
    });
  }
};

/**
 * @desc    Mark all unread notifications as read
 * @route   PATCH /api/notifications/read-all
 * @access  Private (Logged-in user)
 */
const markAllAsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { $set: { read: true } }
    );

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount,
      unreadCount: 0,
    });
  } catch (error) {
    console.error(`[Mark All Read Error] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error marking all notifications as read',
      error: error.message,
    });
  }
};

module.exports = {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
