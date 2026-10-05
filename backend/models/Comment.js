/**
 * Comment Model
 * Discussion and communication thread associated with complaints.
 */
const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    complaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
      required: [true, 'Please provide associated complaint ID'],
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please provide author user ID'],
    },
    authorName: {
      type: String,
      required: [true, 'Author name is required'],
      trim: true,
      maxlength: [100, 'Author name cannot exceed 100 characters'],
    },
    authorRole: {
      type: String,
      required: [true, 'Author role is required'],
      enum: {
        values: ['student', 'staff', 'admin'],
        message: '{VALUE} is not an authorized role for commenting',
      },
    },
    text: {
      type: String,
      required: [true, 'Comment content cannot be empty'],
      trim: true,
      minlength: [1, 'Comment must contain at least 1 character'],
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

commentSchema.index({ complaintId: 1, createdAt: 1 });

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;
