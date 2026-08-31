/**
 * Admin Controller
 * High-level administrative operations: Dashboard analytics, complaint assignment, status overrides, and user listings.
 */
const Complaint = require('../models/Complaint');
const User = require('../models/User');

/**
 * @desc    Get dashboard metrics and analytics
 * @route   GET /api/admin/dashboard
 * @access  Private (Admin only)
 */
const getAdminDashboard = async (req, res) => {
  try {
    // Basic counts across statuses
    const [
      totalComplaints,
      pendingCount,
      reviewedCount,
      assignedCount,
      inProgressCount,
      resolvedCount,
      totalStudents,
      totalStaff,
    ] = await Promise.all([
      Complaint.countDocuments(),
      Complaint.countDocuments({ status: 'PENDING' }),
      Complaint.countDocuments({ status: 'REVIEWED' }),
      Complaint.countDocuments({ status: 'ASSIGNED' }),
      Complaint.countDocuments({ status: 'IN_PROGRESS' }),
      Complaint.countDocuments({ status: 'RESOLVED' }),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'staff' }),
    ]);

    // Grouping by category
    const categoryAggregation = await Complaint.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          category: '$_id',
          count: 1,
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Grouping by priority
    const priorityAggregation = await Complaint.aggregate([
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          priority: '$_id',
          count: 1,
        },
      },
      { $sort: { count: -1 } },
    ]);

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          total: totalComplaints,
          pending: pendingCount,
          reviewed: reviewedCount,
          assigned: assignedCount,
          inProgress: inProgressCount,
          resolved: resolvedCount,
          totalStudents,
          totalStaff,
        },
        byCategory: categoryAggregation,
        byPriority: priorityAggregation,
      },
    });
  } catch (error) {
    console.error(`[Admin Dashboard Error] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error generating admin dashboard analytics',
      error: error.message,
    });
  }
};

/**
 * @desc    Get all complaints with filtering, search, and pagination
 * @route   GET /api/admin/complaints
 * @access  Private (Admin only)
 */
const getAllComplaints = async (req, res) => {
  try {
    const { status, category, priority, search, page = 1, limit = 10 } = req.query;

    const query = {};

    if (status) {
      query.status = status.toUpperCase();
    }

    if (category) {
      query.category = category;
    }

    if (priority) {
      query.priority = priority.toUpperCase();
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
    const limitNum = parseInt(limit, 10) > 0 ? parseInt(limit, 10) : 10;
    const skip = (pageNum - 1) * limitNum;

    const [total, complaints] = await Promise.all([
      Complaint.countDocuments(query),
      Complaint.find(query)
        .populate('createdBy', 'name email studentId role')
        .populate('assignedTo', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
    ]);

    return res.status(200).json({
      success: true,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
      complaints,
    });
  } catch (error) {
    console.error(`[Admin All Complaints Error] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving all complaints',
      error: error.message,
    });
  }
};

/**
 * @desc    Assign a complaint to a staff member
 * @route   PUT /api/admin/complaints/:id/assign
 * @access  Private (Admin only)
 */
const assignStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { staffId } = req.body;

    if (!staffId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide staffId to assign',
      });
    }

    // Verify staff exists and has role 'staff'
    const staffUser = await User.findById(staffId);
    if (!staffUser) {
      return res.status(404).json({
        success: false,
        message: 'Staff user not found with provided ID',
      });
    }

    if (staffUser.role !== 'staff') {
      return res.status(400).json({
        success: false,
        message: `User with ID ${staffId} has role '${staffUser.role}', which cannot be assigned tasks (role must be 'staff')`,
      });
    }

    // Find complaint
    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
      });
    }

    // Update assignment and status
    complaint.assignedTo = staffUser._id;
    complaint.status = 'ASSIGNED';

    // Append to status history timeline
    complaint.statusHistory.push({
      status: 'ASSIGNED',
      changedAt: new Date(),
      changedBy: req.user._id,
      notes: `Assigned to staff: ${staffUser.name} (${staffUser.email})`,
    });

    await complaint.save();

    const populatedComplaint = await Complaint.findById(id)
      .populate('createdBy', 'name email studentId role')
      .populate('assignedTo', 'name email role')
      .populate('statusHistory.changedBy', 'name email role');

    return res.status(200).json({
      success: true,
      message: `Complaint successfully assigned to ${staffUser.name}`,
      complaint: populatedComplaint,
    });
  } catch (error) {
    console.error(`[Admin Assign Error] ${error.message}`);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID format provided for complaint or staff',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Server error assigning staff to complaint',
      error: error.message,
    });
  }
};

/**
 * @desc    Update complaint status or priority manually (admin override)
 * @route   PUT /api/admin/complaints/:id/status
 * @access  Private (Admin only)
 */
const updateComplaintStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, notes } = req.body;

    if (!status && !priority) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid status or priority to update',
      });
    }

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
      });
    }

    if (status) {
      const upperStatus = status.toUpperCase();
      const allowedStatuses = ['PENDING', 'REVIEWED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'];

      if (!allowedStatuses.includes(upperStatus)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status '${status}'. Allowed statuses: ${allowedStatuses.join(', ')}`,
        });
      }

      complaint.status = upperStatus;
      complaint.statusHistory.push({
        status: upperStatus,
        changedAt: new Date(),
        changedBy: req.user._id,
        notes: notes || `Status updated to ${upperStatus} by admin override`,
      });
    }

    if (priority) {
      const upperPriority = priority.toUpperCase();
      const allowedPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

      if (!allowedPriorities.includes(upperPriority)) {
        return res.status(400).json({
          success: false,
          message: `Invalid priority '${priority}'. Allowed priorities: ${allowedPriorities.join(', ')}`,
        });
      }

      complaint.priority = upperPriority;
    }

    await complaint.save();

    const populatedComplaint = await Complaint.findById(id)
      .populate('createdBy', 'name email studentId role')
      .populate('assignedTo', 'name email role')
      .populate('statusHistory.changedBy', 'name email role');

    const message = status && priority
      ? `Status updated to ${status} and priority updated to ${priority}`
      : status
      ? `Status updated to ${status}`
      : `Priority updated to ${priority}`;

    return res.status(200).json({
      success: true,
      message,
      complaint: populatedComplaint,
    });
  } catch (error) {
    console.error(`[Admin Update Status Error] ${error.message}`);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid complaint ID format',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Server error updating complaint status',
      error: error.message,
    });
  }
};

/**
 * @desc    Get user list (exclude password, support role filter)
 * @route   GET /api/admin/users
 * @access  Private (Admin only)
 */
const getAllUsers = async (req, res) => {
  try {
    const { role } = req.query;

    const query = {};
    if (role) {
      query.role = role.toLowerCase();
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error(`[Admin Get Users Error] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving users',
      error: error.message,
    });
  }
};

module.exports = {
  getAdminDashboard,
  getAllComplaints,
  assignStaff,
  updateComplaintStatus,
  getAllUsers,
};
