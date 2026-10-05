/**
 * Staff Controller
 * Operations for maintenance personnel: viewing assigned tasks, setting progress, resolving tickets, and CSV export.
 */
const Complaint = require('../models/Complaint');
const notificationService = require('../utils/notificationService');
const { formatComplaintsCsv } = require('../utils/csvExport');

/**
 * @desc    Get all complaints assigned to logged-in staff with advanced filtering
 * @route   GET /api/staff/tasks
 * @access  Private (Staff only)
 */
const getStaffTasks = async (req, res) => {
  try {
    const { status, category, priority, search, startDate, endDate } = req.query;

    const query = { assignedTo: req.user._id };

    if (status) {
      query.status = status.toUpperCase();
    }

    if (category) {
      query.category = category;
    }

    if (priority) {
      query.priority = priority.toUpperCase();
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

    const tasks = await Complaint.find(query)
      .populate('createdBy', 'name email studentId')
      .populate('statusHistory.changedBy', 'name email role')
      .populate('activityTimeline.actor', 'name email role')
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      count: tasks.length,
      tasks,
    });
  } catch (error) {
    console.error(`[Staff Get Tasks Error] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving staff tasks',
      error: error.message,
    });
  }
};

/**
 * @desc    Update task status (Staff restricted to 'IN_PROGRESS' or 'RESOLVED')
 * @route   PUT /api/staff/tasks/:id/status
 * @access  Private (Staff only, assignedTo == req.user.id)
 */
const updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Please provide status in request body',
      });
    }

    const upperStatus = status.toUpperCase();
    const staffAllowedStatuses = ['IN_PROGRESS', 'RESOLVED'];

    // Enforce role transition boundary
    if (!staffAllowedStatuses.includes(upperStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status '${status}' for staff. Staff can only transition tasks to: ${staffAllowedStatuses.join(' or ')}`,
      });
    }

    const complaint = await Complaint.findById(id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Task/Complaint not found',
      });
    }

    // Authorization check: must be assigned to this staff member
    if (
      !complaint.assignedTo ||
      complaint.assignedTo.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only update tasks assigned to you',
      });
    }

    const now = new Date();
    complaint.status = upperStatus;

    // Append to status history
    complaint.statusHistory.push({
      status: upperStatus,
      changedAt: now,
      changedBy: req.user._id,
      notes: notes || `Status updated to ${upperStatus} by staff`,
    });

    // Append to activity timeline
    complaint.activityTimeline.push({
      eventType: upperStatus === 'RESOLVED' ? 'RESOLVED' : 'STATUS_CHANGED',
      actor: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      message: notes || `Status updated to ${upperStatus} by technician`,
      timestamp: now,
      metadata: { status: upperStatus },
    });

    await complaint.save();

    const populatedComplaint = await Complaint.findById(id)
      .populate('createdBy', 'name email studentId')
      .populate('assignedTo', 'name email role')
      .populate('statusHistory.changedBy', 'name email role')
      .populate('activityTimeline.actor', 'name email role');

    // Notify student
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

    return res.status(200).json({
      success: true,
      message: `Task status updated to ${upperStatus}`,
      task: populatedComplaint,
    });
  } catch (error) {
    console.error(`[Staff Update Status Error] ${error.message}`);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID format',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Server error updating task status',
      error: error.message,
    });
  }
};

/**
 * @desc    Resolve task with resolution notes
 * @route   PUT /api/staff/tasks/:id/resolve
 * @access  Private (Staff only, assignedTo == req.user.id)
 */
const resolveTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolutionNotes } = req.body;

    const complaint = await Complaint.findById(id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Task/Complaint not found',
      });
    }

    // Verify task assignment
    if (
      !complaint.assignedTo ||
      complaint.assignedTo.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only resolve tasks assigned to you',
      });
    }

    const now = new Date();
    complaint.status = 'RESOLVED';
    complaint.resolutionNotes = resolutionNotes || 'Resolved by staff';

    // Append to status timeline
    complaint.statusHistory.push({
      status: 'RESOLVED',
      changedAt: now,
      changedBy: req.user._id,
      notes: resolutionNotes ? `Resolved: ${resolutionNotes}` : 'Resolved by staff',
    });

    // Append to activity timeline
    complaint.activityTimeline.push({
      eventType: 'RESOLVED',
      actor: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      message: resolutionNotes ? `Resolved: ${resolutionNotes}` : 'Resolved by technician',
      timestamp: now,
      metadata: { resolutionNotes: complaint.resolutionNotes },
    });

    await complaint.save();

    const populatedComplaint = await Complaint.findById(id)
      .populate('createdBy', 'name email studentId')
      .populate('assignedTo', 'name email role')
      .populate('statusHistory.changedBy', 'name email role')
      .populate('activityTimeline.actor', 'name email role');

    // Notify student that ticket is resolved
    notificationService.notifyComplaintResolved(
      populatedComplaint,
      populatedComplaint.createdBy,
      complaint.resolutionNotes
    );

    return res.status(200).json({
      success: true,
      message: 'Task resolved successfully',
      task: populatedComplaint,
    });
  } catch (error) {
    console.error(`[Staff Resolve Task Error] ${error.message}`);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID format',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Server error resolving task',
      error: error.message,
    });
  }
};

/**
 * @desc    Export assigned tasks as CSV
 * @route   GET /api/staff/tasks/export
 * @access  Private (Staff only)
 */
const exportStaffTasksCsv = async (req, res) => {
  try {
    const { status, category, priority, search, startDate, endDate } = req.query;

    const query = { assignedTo: req.user._id };

    if (status) query.status = status.toUpperCase();
    if (category) query.category = category;
    if (priority) query.priority = priority.toUpperCase();

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

    const tasks = await Complaint.find(query)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ updatedAt: -1 });

    const csvContent = formatComplaintsCsv(tasks);
    const filename = `staff-tasks-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error(`[Staff Export Tasks Error] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error exporting tasks CSV',
      error: error.message,
    });
  }
};

module.exports = {
  getStaffTasks,
  updateTaskStatus,
  resolveTask,
  exportStaffTasksCsv,
};
