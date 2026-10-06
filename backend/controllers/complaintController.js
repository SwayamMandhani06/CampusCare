/**
 * Complaint Controller (Student Actions & General Complaint Views)
 * Handles creating complaints, viewing user complaints, viewing detail, editing while pending,
 * image attachments, discussion comments, resolution feedback, and CSV export.
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Complaint = require('../models/Complaint');
const Comment = require('../models/Comment');
const notificationService = require('../utils/notificationService');
const { formatComplaintsCsv } = require('../utils/csvExport');
const { UPLOAD_DIR } = require('../utils/upload');
const { evaluatePriority } = require('../services/priorityService');
const { calculateSlaDeadlines, recordFirstResponse, computeSlaStatus } = require('../services/slaService');

/**
 * @desc    Create a new complaint (supports JSON & multipart/form-data with images)
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

    // Process attached image files if present
    const imageAttachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        imageAttachments.push({
          imageId: crypto.randomUUID
            ? crypto.randomUUID()
            : `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          originalName: file.originalname,
          storedName: file.filename,
          mimeType: file.mimetype,
          size: file.size,
          uploadedAt: new Date(),
        });
      }
    }

    const now = new Date();

    // Run deterministic rule-based priority evaluation
    const evaluated = evaluatePriority({ title, description, category, location });
    const finalPriority = (priority && req.user.role === 'admin') ? priority.toUpperCase() : evaluated.priority;
    const finalPrioritySource = (priority && req.user.role === 'admin') ? 'MANUAL' : 'AUTOMATIC';
    const finalPriorityReason = finalPrioritySource === 'MANUAL'
      ? 'Initial manual priority assignment by administrator.'
      : evaluated.priorityReason;

    // Calculate initial SLA deadlines and targets
    const initialSla = calculateSlaDeadlines(finalPriority, now);

    // Build complaint object
    const complaintData = {
      title,
      description,
      category,
      location,
      priority: finalPriority,
      prioritySource: finalPrioritySource,
      priorityReason: finalPriorityReason,
      priorityUpdatedAt: now,
      priorityUpdatedBy: finalPrioritySource === 'MANUAL' ? req.user._id : null,
      sla: initialSla,
      status: 'PENDING',
      createdBy: req.user._id,
      assignedTo: null,
      resolutionNotes: '',
      images: imageAttachments,
      feedback: null,
      // Backward-compatible status history
      statusHistory: [
        {
          status: 'PENDING',
          changedAt: now,
          changedBy: req.user._id,
          notes: 'Complaint registered by student',
        },
      ],
      // Rich activity timeline
      activityTimeline: [
        {
          eventType: 'CREATED',
          actor: req.user._id,
          actorName: req.user.name,
          actorRole: req.user.role,
          message: 'Complaint submitted by student',
          timestamp: now,
        },
        {
          eventType: 'PRIORITY_AUTO_ASSIGNED',
          actorName: 'System Automation',
          actorRole: 'system',
          message: `Priority classified as ${finalPriority}: ${finalPriorityReason}`,
          timestamp: now,
          metadata: { priority: finalPriority, reason: finalPriorityReason, source: finalPrioritySource },
        },
        {
          eventType: 'SLA_STARTED',
          actorName: 'System Automation',
          actorRole: 'system',
          message: `SLA policy activated. Resolution target: ${Math.round(initialSla.resolutionTargetMinutes / 60)} hours.`,
          timestamp: now,
          metadata: {
            responseDeadline: initialSla.responseDeadline,
            resolutionDeadline: initialSla.resolutionDeadline,
            responseTargetMinutes: initialSla.responseTargetMinutes,
            resolutionTargetMinutes: initialSla.resolutionTargetMinutes,
          },
        },
      ],
    };

    if (imageAttachments.length > 0) {
      complaintData.activityTimeline.push({
        eventType: 'IMAGE_UPLOADED',
        actor: req.user._id,
        actorName: req.user.name,
        actorRole: req.user.role,
        message: `Attached ${imageAttachments.length} image(s)`,
        timestamp: now,
        metadata: { imageCount: imageAttachments.length },
      });
    }

    const complaint = await Complaint.create(complaintData);

    // Asynchronously dispatch notifications and emails
    notificationService.notifyComplaintCreated(complaint, req.user);

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
 * @desc    Get all complaints created by the logged-in user with advanced filtering
 * @route   GET /api/complaints
 * @access  Private (Logged-in user / Student)
 */
const getMyComplaints = async (req, res) => {
  try {
    const { status, category, priority, search, startDate, endDate } = req.query;

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

    if (req.query.slaStatus) {
      query['sla.status'] = req.query.slaStatus.toUpperCase();
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    // Search query matches title, description, or location
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
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
 * @desc    Get single complaint by ID with full populated history and images
 * @route   GET /api/complaints/:id
 * @access  Private (Owner student, or any Admin/Staff)
 */
const getComplaintById = async (req, res) => {
  try {
    const { id } = req.params;

    const complaint = await Complaint.findById(id)
      .populate('createdBy', 'name email studentId role')
      .populate('assignedTo', 'name email role')
      .populate('statusHistory.changedBy', 'name email role')
      .populate('activityTimeline.actor', 'name email role');

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

    const complaintObj = complaint.toObject();
    complaintObj.realTimeSla = computeSlaStatus(complaint);

    return res.status(200).json({
      success: true,
      complaint: complaintObj,
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

    complaint.activityTimeline.push({
      eventType: 'STATUS_CHANGED',
      actor: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      message: 'Complaint details modified by student',
      timestamp: new Date(),
    });

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

/**
 * @desc    Secure image retrieval (only owner, assigned staff, admin)
 * @route   GET /api/complaints/:id/images/:imageId
 * @access  Private (Owner student, assigned staff, or admin)
 */
const getComplaintImage = async (req, res) => {
  try {
    const { id, imageId } = req.params;

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
      });
    }

    // Authorization check
    const isOwner = complaint.createdBy.toString() === req.user._id.toString();
    const isAssignedStaff =
      req.user.role === 'staff' &&
      complaint.assignedTo &&
      complaint.assignedTo.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAssignedStaff && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to view attachments for this complaint',
      });
    }

    // Find requested image metadata
    const image = complaint.images.find(
      (img) => img.imageId === imageId || (img._id && img._id.toString() === imageId)
    );

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image attachment not found for this complaint',
      });
    }

    // Resolve path securely and prevent directory traversal
    const safeFilename = path.basename(image.storedName);
    const filePath = path.join(UPLOAD_DIR, safeFilename);

    if (!filePath.startsWith(UPLOAD_DIR)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file path resolution',
      });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File attachment missing on disk',
      });
    }

    res.setHeader('Content-Type', image.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(image.originalName)}"`);
    res.setHeader('Cache-Control', 'private, max-age=86400');

    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => {
      console.error('[Stream Image Error]', err.message);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Error streaming file' });
      }
    });
    return stream.pipe(res);
  } catch (error) {
    console.error(`[Get Image Error] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving image',
      error: error.message,
    });
  }
};

/**
 * @desc    Post comment to complaint
 * @route   POST /api/complaints/:id/comments
 * @access  Private (Owner student, assigned staff, or admin)
 */
const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment content cannot be empty',
      });
    }

    const trimmedText = text.trim();
    if (trimmedText.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Comment exceeds maximum allowed length of 1000 characters',
      });
    }

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
      });
    }

    // Authorization check
    const isOwner = complaint.createdBy.toString() === req.user._id.toString();
    const isAssignedStaff =
      req.user.role === 'staff' &&
      complaint.assignedTo &&
      complaint.assignedTo.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAssignedStaff && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to comment on this complaint',
      });
    }

    const now = new Date();

    const comment = await Comment.create({
      complaintId: complaint._id,
      userId: req.user._id,
      authorName: req.user.name,
      authorRole: req.user.role,
      text: trimmedText,
      createdAt: now,
    });

    complaint.activityTimeline.push({
      eventType: 'COMMENT_ADDED',
      actor: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      message: `Comment added by ${req.user.name} (${req.user.role})`,
      timestamp: now,
      metadata: { commentId: comment._id },
    });

    // If responder is staff or admin, count towards first response SLA
    if (req.user.role === 'staff' || req.user.role === 'admin') {
      recordFirstResponse(complaint, now);
    }

    await complaint.save();

    // Trigger notification
    notificationService.notifyCommentAdded(complaint, req.user, trimmedText);

    return res.status(201).json({
      success: true,
      message: 'Comment posted successfully',
      comment,
    });
  } catch (error) {
    console.error(`[Add Comment Error] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error posting comment',
      error: error.message,
    });
  }
};

/**
 * @desc    Get comments for a complaint
 * @route   GET /api/complaints/:id/comments
 * @access  Private (Owner student, assigned staff, or admin)
 */
const getComments = async (req, res) => {
  try {
    const { id } = req.params;

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
      });
    }

    // Authorization check
    const isOwner = complaint.createdBy.toString() === req.user._id.toString();
    const isAssignedStaff =
      req.user.role === 'staff' &&
      complaint.assignedTo &&
      complaint.assignedTo.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAssignedStaff && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to view comments for this complaint',
      });
    }

    const comments = await Comment.find({ complaintId: id }).sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      count: comments.length,
      comments,
    });
  } catch (error) {
    console.error(`[Get Comments Error] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving comments',
      error: error.message,
    });
  }
};

/**
 * @desc    Submit resolution rating and feedback
 * @route   POST /api/complaints/:id/feedback
 * @access  Private (Creating student only, only when RESOLVED)
 */
const submitFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
      });
    }

    // Only creator student can submit feedback
    if (complaint.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only the student who raised this complaint can submit feedback',
      });
    }

    // Only allowed if RESOLVED
    if (complaint.status !== 'RESOLVED') {
      return res.status(400).json({
        success: false,
        message: `Feedback can only be submitted for resolved complaints (current status: '${complaint.status}')`,
      });
    }

    // Check duplicate feedback
    if (complaint.feedback && complaint.feedback.rating) {
      return res.status(409).json({
        success: false,
        message: 'Feedback has already been submitted for this complaint',
      });
    }

    // Validate rating
    const ratingNum = parseInt(rating, 10);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid rating between 1 and 5',
      });
    }

    const trimmedComment = (comment || '').trim();
    if (trimmedComment.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Feedback comment cannot exceed 500 characters',
      });
    }

    const now = new Date();
    const feedbackObj = {
      rating: ratingNum,
      comment: trimmedComment,
      submittedAt: now,
    };

    complaint.feedback = feedbackObj;

    complaint.activityTimeline.push({
      eventType: 'FEEDBACK_SUBMITTED',
      actor: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      message: `Student rated resolution ${ratingNum}/5 stars`,
      timestamp: now,
      metadata: { rating: ratingNum },
    });

    await complaint.save();

    // Trigger notification
    notificationService.notifyFeedbackSubmitted(complaint, req.user, feedbackObj);

    return res.status(201).json({
      success: true,
      message: 'Thank you for your feedback! Rating recorded.',
      feedback: feedbackObj,
    });
  } catch (error) {
    console.error(`[Submit Feedback Error] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error submitting feedback',
      error: error.message,
    });
  }
};

/**
 * @desc    Export student's complaints as CSV
 * @route   GET /api/complaints/export
 * @access  Private (Logged-in Student)
 */
const exportMyComplaintsCsv = async (req, res) => {
  try {
    const { status, category, priority, search, startDate, endDate } = req.query;

    const query = { createdBy: req.user._id };

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

    const complaints = await Complaint.find(query)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });

    const csvContent = formatComplaintsCsv(complaints);
    const filename = `my-complaints-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error(`[Export My Complaints Error] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error exporting complaints CSV',
      error: error.message,
    });
  }
};

module.exports = {
  createComplaint,
  getMyComplaints,
  getComplaintById,
  updateComplaint,
  getComplaintImage,
  addComment,
  getComments,
  submitFeedback,
  exportMyComplaintsCsv,
};
