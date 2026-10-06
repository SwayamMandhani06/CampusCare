/**
 * Admin Controller
 * High-level administrative operations: Dashboard analytics, complaint assignment, status overrides, user listings, and CSV export.
 */
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const notificationService = require('../utils/notificationService');
const { formatComplaintsCsv } = require('../utils/csvExport');
const {
  calculateSlaDeadlines,
  recordFirstResponse,
  recordResolution,
  computeSlaStatus,
} = require('../services/slaService');

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
      onTrackCount,
      atRiskCount,
      breachedCount,
      escalatedCount,
      resolvedComplaints,
    ] = await Promise.all([
      Complaint.countDocuments(),
      Complaint.countDocuments({ status: 'PENDING' }),
      Complaint.countDocuments({ status: 'REVIEWED' }),
      Complaint.countDocuments({ status: 'ASSIGNED' }),
      Complaint.countDocuments({ status: 'IN_PROGRESS' }),
      Complaint.countDocuments({ status: 'RESOLVED' }),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'staff' }),
      Complaint.countDocuments({ status: { $ne: 'RESOLVED' }, 'sla.status': 'ON_TRACK' }),
      Complaint.countDocuments({ status: { $ne: 'RESOLVED' }, 'sla.status': 'AT_RISK' }),
      Complaint.countDocuments({ status: { $ne: 'RESOLVED' }, 'sla.status': 'BREACHED' }),
      Complaint.countDocuments({ status: { $ne: 'RESOLVED' }, 'sla.escalated': true }),
      Complaint.find({ status: 'RESOLVED' }).select('sla createdAt updatedAt'),
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

    // SLA Compliance & Resolution Time calculation
    const totalActive = pendingCount + reviewedCount + assignedCount + inProgressCount;
    const compliantCount = resolvedComplaints.filter(
      (c) => !c.sla || !c.sla.resolutionBreached
    ).length;
    const slaCompliancePercentage =
      resolvedComplaints.length > 0
        ? Math.round((compliantCount / resolvedComplaints.length) * 100)
        : 100;

    const totalResolutionMs = resolvedComplaints.reduce((acc, c) => {
      const resTime = c.sla?.resolutionAt || c.updatedAt;
      const diff = new Date(resTime).getTime() - new Date(c.createdAt).getTime();
      return acc + (diff > 0 ? diff : 0);
    }, 0);

    const averageResolutionTimeHours =
      resolvedComplaints.length > 0
        ? parseFloat(
            (totalResolutionMs / (resolvedComplaints.length * 3600 * 1000)).toFixed(1)
          )
        : 0;

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
        slaMetrics: {
          totalActive,
          onTrack: onTrackCount,
          atRisk: atRiskCount,
          breached: breachedCount,
          escalated: escalatedCount,
          averageResolutionTimeHours,
          slaCompliancePercentage,
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
    const {
      status,
      category,
      priority,
      search,
      assignedStaff,
      startDate,
      endDate,
      page = 1,
      limit = 10,
    } = req.query;

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

    if (req.query.slaStatus) {
      query['sla.status'] = req.query.slaStatus.toUpperCase();
    }

    if (req.query.escalated !== undefined && req.query.escalated !== '') {
      query['sla.escalated'] = req.query.escalated === 'true';
    }

    if (req.query.prioritySource) {
      query.prioritySource = req.query.prioritySource.toUpperCase();
    }

    if (assignedStaff) {
      if (assignedStaff === 'unassigned') {
        query.assignedTo = null;
      } else {
        query.assignedTo = assignedStaff;
      }
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
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

    const now = new Date();

    // Update assignment and status
    complaint.assignedTo = staffUser._id;
    complaint.status = 'ASSIGNED';
    recordFirstResponse(complaint, now);

    // Append to status history timeline
    complaint.statusHistory.push({
      status: 'ASSIGNED',
      changedAt: now,
      changedBy: req.user._id,
      notes: `Assigned to staff: ${staffUser.name} (${staffUser.email})`,
    });

    // Append to activity timeline
    complaint.activityTimeline.push({
      eventType: 'ASSIGNED',
      actor: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      message: `Assigned to ${staffUser.name} (${staffUser.email})`,
      timestamp: now,
      metadata: { staffId: staffUser._id, staffName: staffUser.name },
    });

    await complaint.save();

    const populatedComplaint = await Complaint.findById(id)
      .populate('createdBy', 'name email studentId role')
      .populate('assignedTo', 'name email role')
      .populate('statusHistory.changedBy', 'name email role')
      .populate('activityTimeline.actor', 'name email role');

    // Dispatch notifications
    notificationService.notifyComplaintAssigned(
      populatedComplaint,
      staffUser,
      populatedComplaint.createdBy
    );

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

    const now = new Date();

    if (status) {
      const upperStatus = status.toUpperCase();
      const allowedStatuses = ['PENDING', 'REVIEWED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'];

      if (!allowedStatuses.includes(upperStatus)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status '${status}'. Allowed statuses: ${allowedStatuses.join(', ')}`,
        });
      }

      if (upperStatus !== 'PENDING') {
        recordFirstResponse(complaint, now);
      }

      if (upperStatus === 'RESOLVED') {
        const wasResolved = recordResolution(complaint, now);
        if (wasResolved) {
          complaint.activityTimeline.push({
            eventType: 'SLA_RESOLVED',
            actor: req.user._id,
            actorName: req.user.name,
            actorRole: req.user.role,
            message: complaint.sla?.resolutionBreached
              ? 'Complaint marked RESOLVED after SLA deadline (breached).'
              : 'Complaint marked RESOLVED within SLA target window.',
            timestamp: now,
            metadata: {
              resolutionBreached: complaint.sla?.resolutionBreached,
              resolutionAt: now,
            },
          });
        }
      }

      complaint.status = upperStatus;
      complaint.statusHistory.push({
        status: upperStatus,
        changedAt: now,
        changedBy: req.user._id,
        notes: notes || `Status updated to ${upperStatus} by admin override`,
      });

      complaint.activityTimeline.push({
        eventType: upperStatus === 'RESOLVED' ? 'RESOLVED' : 'STATUS_CHANGED',
        actor: req.user._id,
        actorName: req.user.name,
        actorRole: req.user.role,
        message: notes || `Status set to ${upperStatus} by admin`,
        timestamp: now,
        metadata: { newStatus: upperStatus },
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

      const oldPriority = complaint.priority;
      complaint.priority = upperPriority;
      complaint.prioritySource = 'MANUAL';
      complaint.priorityReason = notes || `Manual priority override to ${upperPriority} by administrator`;
      complaint.priorityUpdatedAt = now;
      complaint.priorityUpdatedBy = req.user._id;
      complaint.sla = calculateSlaDeadlines(upperPriority, complaint.createdAt, complaint.sla);

      complaint.activityTimeline.push({
        eventType: 'PRIORITY_CHANGED',
        actor: req.user._id,
        actorName: req.user.name,
        actorRole: req.user.role,
        message: `Priority manually changed from ${oldPriority} to ${upperPriority}: ${complaint.priorityReason}`,
        timestamp: now,
        metadata: {
          previousPriority: oldPriority,
          newPriority: upperPriority,
          reason: complaint.priorityReason,
          source: 'MANUAL',
        },
      });

      notificationService.notifyPriorityChanged(
        complaint,
        req.user,
        oldPriority,
        upperPriority,
        complaint.priorityReason
      );
    }

    await complaint.save();

    const populatedComplaint = await Complaint.findById(id)
      .populate('createdBy', 'name email studentId role')
      .populate('assignedTo', 'name email role')
      .populate('statusHistory.changedBy', 'name email role')
      .populate('activityTimeline.actor', 'name email role');

    if (status) {
      const upperStatus = status.toUpperCase();
      if (upperStatus === 'RESOLVED') {
        notificationService.notifyComplaintResolved(
          populatedComplaint,
          populatedComplaint.createdBy,
          notes
        );
      } else {
        notificationService.notifyComplaintStatusChanged(
          populatedComplaint,
          populatedComplaint.createdBy,
          upperStatus,
          notes
        );
      }
    }

    const message =
      status && priority
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

/**
 * @desc    Export all filtered complaints as CSV
 * @route   GET /api/admin/complaints/export
 * @access  Private (Admin only)
 */
const exportAdminComplaintsCsv = async (req, res) => {
  try {
    const { status, category, priority, search, assignedStaff, startDate, endDate } = req.query;

    const query = {};

    if (status) query.status = status.toUpperCase();
    if (category) query.category = category;
    if (priority) query.priority = priority.toUpperCase();

    if (assignedStaff) {
      if (assignedStaff === 'unassigned') query.assignedTo = null;
      else query.assignedTo = assignedStaff;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ];
    }

    const complaints = await Complaint.find(query)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });

    const csvContent = formatComplaintsCsv(complaints);
    const filename = `campuscare-all-complaints-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error(`[Admin Export CSV Error] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error exporting complaints CSV',
      error: error.message,
    });
  }
};

/**
 * @desc    Manually override complaint priority with mandatory reason (Admin only)
 * @route   PUT /api/admin/complaints/:id/priority
 * @access  Private (Admin only)
 */
const updateComplaintPriority = async (req, res) => {
  try {
    const { id } = req.params;
    const { priority, reason } = req.body;

    if (!priority) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid priority level (LOW, MEDIUM, HIGH, CRITICAL)',
      });
    }

    const upperPriority = priority.toUpperCase();
    const allowedPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    if (!allowedPriorities.includes(upperPriority)) {
      return res.status(400).json({
        success: false,
        message: `Invalid priority '${priority}'. Allowed priorities: ${allowedPriorities.join(', ')}`,
      });
    }

    if (!reason || !reason.trim() || reason.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid reason for changing priority (minimum 5 characters)',
      });
    }

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
      });
    }

    const oldPriority = complaint.priority;
    const now = new Date();

    complaint.priority = upperPriority;
    complaint.prioritySource = 'MANUAL';
    complaint.priorityReason = reason.trim();
    complaint.priorityUpdatedAt = now;
    complaint.priorityUpdatedBy = req.user._id;
    complaint.sla = calculateSlaDeadlines(upperPriority, complaint.createdAt, complaint.sla);

    complaint.activityTimeline.push({
      eventType: 'PRIORITY_CHANGED',
      actor: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      message: `Priority manually updated from ${oldPriority} to ${upperPriority}: ${reason.trim()}`,
      timestamp: now,
      metadata: {
        previousPriority: oldPriority,
        newPriority: upperPriority,
        reason: reason.trim(),
        source: 'MANUAL',
      },
    });

    await complaint.save();

    const populatedComplaint = await Complaint.findById(id)
      .populate('createdBy', 'name email studentId role')
      .populate('assignedTo', 'name email role')
      .populate('statusHistory.changedBy', 'name email role')
      .populate('activityTimeline.actor', 'name email role');

    notificationService.notifyPriorityChanged(
      populatedComplaint,
      req.user,
      oldPriority,
      upperPriority,
      reason.trim()
    );

    return res.status(200).json({
      success: true,
      message: `Priority updated to ${upperPriority} successfully`,
      complaint: populatedComplaint,
    });
  } catch (error) {
    console.error(`[Admin Update Priority Error] ${error.message}`);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid complaint ID format',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Server error updating complaint priority',
      error: error.message,
    });
  }
};

module.exports = {
  getAdminDashboard,
  getAllComplaints,
  assignStaff,
  updateComplaintStatus,
  updateComplaintPriority,
  getAllUsers,
  exportAdminComplaintsCsv,
};
