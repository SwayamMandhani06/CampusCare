/**
 * Notification Model
 * Tracks in-app alerts and notifications across campus facility events.
 */
const mongoose = require('mongoose');

const allowedNotificationTypes = [
  'COMPLAINT_CREATED',
  'COMPLAINT_ASSIGNED',
  'STATUS_CHANGED',
  'COMPLAINT_RESOLVED',
  'COMMENT_ADDED',
  'FEEDBACK_SUBMITTED',
  'PRIORITY_CHANGED',
  'SLA_AT_RISK',
  'SLA_BREACH',
  'SLA_BREACHED',
  'COMPLAINT_ESCALATED',
];

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Notification recipient is required'],
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: allowedNotificationTypes,
        message: '{VALUE} is not a supported notification event type',
      },
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [120, 'Notification title cannot exceed 120 characters'],
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: [500, 'Notification message cannot exceed 500 characters'],
    },
    complaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
      default: null,
      index: true,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

Notification.types = allowedNotificationTypes;

module.exports = Notification;
