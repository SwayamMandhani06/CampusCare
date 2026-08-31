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

// Sub-schema for timeline tracking
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
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
);

// Helpful constants exported alongside model
complaintSchema.statics.categories = allowedCategories;
complaintSchema.statics.priorities = allowedPriorities;
complaintSchema.statics.statuses = allowedStatuses;

const Complaint = mongoose.model('Complaint', complaintSchema);

module.exports = Complaint;
