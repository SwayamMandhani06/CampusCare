/**
 * Complaint Controller (Student Actions & General Complaint Views)
 * Handles creating complaints, viewing user complaints, viewing detail, and editing while pending.
 */
const Complaint = require('../models/Complaint');

/**
 * @desc    Create a new complaint
 * @route   POST /api/complaints
 * @access  Private (Students / Users)
 */
const createComplaint = async (req, res) => {
  try {
    const { title, description, category, location, priority } = req.body;

    // Validate required fields
    if (!title || !description || !category || !location) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title, description, category, and location',
      });
    }

    // Build complaint object
    const complaintData = {
      title,
      description,
      category,
      location,
      priority: priority || 'MEDIUM',
      status: 'PENDING',
      createdBy: req.user._id,
      assignedTo: null,
      resolutionNotes: '',
      // Initial status timeline entry
      statusHistory: [
        {
          status: 'PENDING',
          changedAt: new Date(),
          changedBy: req.user._id,
          notes: 'Complaint registered by student',
        },
      ],
    };

    const complaint = await Complaint.create(complaintData);

    return res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully',
      complaint,
    });
  } catch (error) {
    console.error(`[Create Complaint Error] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error creating complaint',
      error: error.message,
    });
  }
};

/**
 * @desc    Get all complaints created by the logged-in user
 * @route   GET /api/complaints
 * @access  Private (Logged-in user / Student)
 */
const getMyComplaints = async (req, res) => {
  try {
    const { status, category, priority, search } = req.query;

    // Filter by creating user
    const query = { createdBy: req.user._id };

    if (status) {
      query.status = status.toUpperCase();
    }

    if (category) {
      query.category = category;
    }

    if (priority) {
      query.priority = priority.toUpperCase();
    }

    // Search query matches title or description
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const complaints = await Complaint.find(query)
      .populate('assignedTo', 'name email role')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: complaints.length,
      complaints,
    });
  } catch (error) {
    console.error(`[Get My Complaints Error] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving complaints',
      error: error.message,
    });
  }
};

/**
 * @desc    Get single complaint by ID
 * @route   GET /api/complaints/:id
 * @access  Private (Owner student, or any Admin/Staff)
 */
const getComplaintById = async (req, res) => {
  try {
    const { id } = req.params;

    const complaint = await Complaint.findById(id)
      .populate('createdBy', 'name email studentId role')
      .populate('assignedTo', 'name email role')
      .populate('statusHistory.changedBy', 'name email role');

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
      });
    }

    // Authorization: Students can only view their own complaint; Admin/Staff can view any
    if (
      req.user.role === 'student' &&
      complaint.createdBy._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to view this complaint',
      });
    }

    return res.status(200).json({
      success: true,
      complaint,
    });
  } catch (error) {
    console.error(`[Get Complaint By ID Error] ${error.message}`);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid complaint ID format',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving complaint detail',
      error: error.message,
    });
  }
};

/**
 * @desc    Update complaint details (only by creator, only while PENDING)
 * @route   PUT /api/complaints/:id
 * @access  Private (Creating student only)
 */
const updateComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, location, priority } = req.body;

    const complaint = await Complaint.findById(id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
      });
    }

    // Only creating student can update
    if (complaint.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not the creator of this complaint',
      });
    }

    // Restrict edits: Only allowed while status is still PENDING
    if (complaint.status !== 'PENDING') {
      return res.status(409).json({
        success: false,
        message: `Complaint cannot be edited once reviewed or processed (current status: '${complaint.status}')`,
      });
    }

    // Apply updates
    if (title) complaint.title = title;
    if (description) complaint.description = description;
    if (category) complaint.category = category;
    if (location) complaint.location = location;
    if (priority) complaint.priority = priority.toUpperCase();

    const updatedComplaint = await complaint.save();

    return res.status(200).json({
      success: true,
      message: 'Complaint updated successfully',
      complaint: updatedComplaint,
    });
  } catch (error) {
    console.error(`[Update Complaint Error] ${error.message}`);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid complaint ID format',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Server error updating complaint',
      error: error.message,
    });
  }
};

module.exports = {
  createComplaint,
  getMyComplaints,
  getComplaintById,
  updateComplaint,
};
