/**
 * Complaint Model
 * Schema for campus complaints/issues submitted by students and managed by admin & staff.
 * Includes Batch 1 (Attachments, Comments, History, Feedback) and
 * Batch 2 (Rule-Based Priority Automation, SLA Tracking, Risk Detection, Escalation).
 */
const mongoose = require('mongoose');

const allowedCategories = [
  'Electrical',
  'Plumbing',
  'Internet/WiFi',
  'Furniture',
  'Equipment',
  'Cleanliness',
  'Hostel Maintenance',
  'Classroom Infrastructure',
  'Other',
];

const allowedPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const allowedStatuses = ['PENDING', 'REVIEWED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'];
const allowedSlaStatuses = ['ON_TRACK', 'AT_RISK', 'BREACHED', 'RESOLVED'];

// Sub-schema for timeline tracking (Preserved for 100% backward compatibility)
const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: allowedStatuses,
      required: true,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: true }
);

// Sub-schema for uploaded complaint attachments
const complaintImageSchema = new mongoose.Schema(
  {
    imageId: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
      trim: true,
    },
    storedName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

// Sub-schema for student resolution feedback and rating
const complaintFeedbackSchema = new mongoose.Schema(
  {
    rating: {
      type: Number,
      required: true,
      min: [1, 'Rating must be between 1 and 5'],
      max: [5, 'Rating must be between 1 and 5'],
    },
    comment: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Feedback comment cannot exceed 500 characters'],
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

// Sub-schema for comprehensive activity history
const activityTimelineSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      enum: [
        'CREATED',
        'STATUS_CHANGED',
        'ASSIGNED',
        'PRIORITY_CHANGED',
        'PRIORITY_AUTO_ASSIGNED',
        'SLA_STARTED',
        'SLA_AT_RISK',
        'SLA_BREACHED',
        'COMPLAINT_ESCALATED',
        'SLA_RESOLVED',
        'AI_RECLASSIFIED',
        'DUPLICATE_FLAGGED',
        'COMMENT_ADDED',
        'RESOLVED',
        'FEEDBACK_SUBMITTED',
        'IMAGE_UPLOADED',
      ],
      required: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    actorName: {
      type: String,
      required: true,
    },
    actorRole: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: true }
);

// Sub-schema for SLA policy tracking and risk detection
const slaTrackingSchema = new mongoose.Schema(
  {
    responseTargetMinutes: {
      type: Number,
      default: 720, // 12h default (MEDIUM)
    },
    resolutionTargetMinutes: {
      type: Number,
      default: 2880, // 48h default (MEDIUM)
    },
    responseDeadline: {
      type: Date,
    },
    resolutionDeadline: {
      type: Date,
    },
    responseAt: {
      type: Date,
      default: null,
    },
    resolutionAt: {
      type: Date,
      default: null,
    },
    responseBreached: {
      type: Boolean,
      default: false,
    },
    resolutionBreached: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: allowedSlaStatuses,
      default: 'ON_TRACK',
    },
    lastCheckedAt: {
      type: Date,
      default: Date.now,
    },
    escalated: {
      type: Boolean,
      default: false,
    },
    escalationLevel: {
      type: Number,
      default: 0,
    },
    escalatedAt: {
      type: Date,
      default: null,
    },
    atRiskNotified: {
      type: Boolean,
      default: false,
    },
    breachNotified: {
      type: Boolean,
      default: false,
    },
    escalation1Notified: {
      type: Boolean,
      default: false,
    },
    escalation2Notified: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const complaintSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a complaint title'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Please provide a detailed description'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Please select a valid category'],
      enum: {
        values: allowedCategories,
        message: '{VALUE} is not a supported category',
      },
    },
    location: {
      type: String,
      required: [true, 'Please specify the location of the issue'],
      trim: true,
    },
    priority: {
      type: String,
      enum: {
        values: allowedPriorities,
        message: '{VALUE} is not a valid priority level',
      },
      default: 'MEDIUM',
    },
    prioritySource: {
      type: String,
      enum: ['AUTOMATIC', 'MANUAL'],
      default: 'AUTOMATIC',
    },
    priorityReason: {
      type: String,
      default: 'Default priority assigned.',
      trim: true,
    },
    priorityUpdatedAt: {
      type: Date,
      default: null,
    },
    priorityUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: allowedStatuses,
        message: '{VALUE} is not a valid complaint status',
      },
      default: 'PENDING',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolutionNotes: {
      type: String,
      default: '',
      trim: true,
    },
    statusHistory: [statusHistorySchema],
    images: {
      type: [complaintImageSchema],
      default: [],
    },
    feedback: {
      type: complaintFeedbackSchema,
      default: null,
    },
    activityTimeline: {
      type: [activityTimelineSchema],
      default: [],
    },
    sla: {
      type: slaTrackingSchema,
      default: () => ({}),
    },
    // Batch 3: AI-Assisted Classification Metadata
    classificationSource: {
      type: String,
      enum: ['RULE_BASED', 'AI', 'MANUAL'],
      default: 'RULE_BASED',
    },
    classificationConfidence: {
      type: Number,
      default: 1.0,
    },
    classificationKeywords: {
      type: [String],
      default: [],
    },
    classificationTimestamp: {
      type: Date,
      default: null,
    },
    classificationProvider: {
      type: String,
      default: 'deterministic',
    },
    // Batch 3: Duplicate Complaint Detection Metadata
    duplicateDetected: {
      type: Boolean,
      default: false,
    },
    duplicateOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
      default: null,
    },
    duplicateSimilarityScore: {
      type: Number,
      default: 0,
    },
    duplicateMatchReason: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
);

// Indexes for high-frequency queries
complaintSchema.index({ status: 1 });
complaintSchema.index({ category: 1 });
complaintSchema.index({ priority: 1 });
complaintSchema.index({ prioritySource: 1 });
complaintSchema.index({ createdBy: 1 });
complaintSchema.index({ assignedTo: 1 });
complaintSchema.index({ createdAt: -1 });
complaintSchema.index({ 'sla.status': 1, status: 1 });
complaintSchema.index({ 'sla.resolutionDeadline': 1 });
complaintSchema.index({ 'sla.escalated': 1 });
complaintSchema.index({ classificationSource: 1 });
complaintSchema.index({ duplicateDetected: 1 });
complaintSchema.index({ duplicateOf: 1 });

// Helpful constants exported alongside model
complaintSchema.statics.categories = allowedCategories;
complaintSchema.statics.priorities = allowedPriorities;
complaintSchema.statics.statuses = allowedStatuses;
complaintSchema.statics.slaStatuses = allowedSlaStatuses;

const Complaint = mongoose.model('Complaint', complaintSchema);

module.exports = Complaint;
