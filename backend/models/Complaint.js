/**
 * Complaint Model
 * Schema for campus complaints/issues submitted by students and managed by admin & staff.
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
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
);

// Indexes for high-frequency queries
complaintSchema.index({ status: 1 });
complaintSchema.index({ category: 1 });
complaintSchema.index({ priority: 1 });
complaintSchema.index({ createdBy: 1 });
complaintSchema.index({ assignedTo: 1 });
complaintSchema.index({ createdAt: -1 });

// Helpful constants exported alongside model
complaintSchema.statics.categories = allowedCategories;
complaintSchema.statics.priorities = allowedPriorities;
complaintSchema.statics.statuses = allowedStatuses;

const Complaint = mongoose.model('Complaint', complaintSchema);

module.exports = Complaint;
