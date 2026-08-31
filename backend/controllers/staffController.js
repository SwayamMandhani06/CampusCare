/**
 * Staff Controller
 * Operations for maintenance personnel: viewing assigned tasks, setting progress, and resolving tickets with notes.
 */
const Complaint = require('../models/Complaint');

/**
 * @desc    Get all complaints assigned to logged-in staff
 * @route   GET /api/staff/tasks
 * @access  Private (Staff only)
 */
const getStaffTasks = async (req, res) => {
  try {
    const { status, priority, search } = req.query;

    const query = { assignedTo: req.user._id };

    if (status) {
      query.status = status.toUpperCase();
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

    const tasks = await Complaint.find(query)
      .populate('createdBy', 'name email studentId')
      .populate('statusHistory.changedBy', 'name email role')
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

    complaint.status = upperStatus;

    // Append to status history
    complaint.statusHistory.push({
      status: upperStatus,
      changedAt: new Date(),
      changedBy: req.user._id,
      notes: notes || `Status updated to ${upperStatus} by staff`,
    });

    await complaint.save();

    const populatedComplaint = await Complaint.findById(id)
      .populate('createdBy', 'name email studentId')
      .populate('assignedTo', 'name email role')
      .populate('statusHistory.changedBy', 'name email role');

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

    complaint.status = 'RESOLVED';
    complaint.resolutionNotes = resolutionNotes || 'Resolved by staff';

    // Append to status timeline
    complaint.statusHistory.push({
      status: 'RESOLVED',
      changedAt: new Date(),
      changedBy: req.user._id,
      notes: resolutionNotes ? `Resolved: ${resolutionNotes}` : 'Resolved by staff',
    });

    await complaint.save();

    const populatedComplaint = await Complaint.findById(id)
      .populate('createdBy', 'name email studentId')
      .populate('assignedTo', 'name email role')
      .populate('statusHistory.changedBy', 'name email role');

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

module.exports = {
  getStaffTasks,
  updateTaskStatus,
  resolveTask,
};
