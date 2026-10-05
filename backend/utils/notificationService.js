/**
 * Notification Service
 * Coordinates in-app database alerts and asynchronous email dispatches.
 */
const Notification = require('../models/Notification');
const User = require('../models/User');
const emailService = require('./emailService');

class NotificationService {
  /**
   * Helper to safely persist an in-app notification without breaking caller execution
   */
  async createNotification({ recipientId, type, title, message, complaintId = null, metadata = {} }) {
    try {
      if (!recipientId) return null;
      return await Notification.create({
        recipient: recipientId,
        type,
        title,
        message,
        complaintId,
        metadata,
      });
    } catch (err) {
      console.warn(`[NotificationService] Error creating notification: ${err.message}`);
      return null;
    }
  }

  /**
   * 1. Complaint Created
   */
  async notifyComplaintCreated(complaint, student) {
    try {
      // Notify student
      await this.createNotification({
        recipientId: student._id || student,
        type: 'COMPLAINT_CREATED',
        title: 'Complaint Registered',
        message: `Your complaint "${complaint.title}" has been successfully logged with status PENDING.`,
        complaintId: complaint._id,
      });

      // Send email
      emailService.sendComplaintCreated(complaint, student);

      // Notify campus admins of new complaint
      const admins = await User.find({ role: 'admin' }).select('_id name email');
      for (const admin of admins) {
        await this.createNotification({
          recipientId: admin._id,
          type: 'COMPLAINT_CREATED',
          title: 'New Complaint Submitted',
          message: `Student ${student.name || 'User'} submitted: "${complaint.title}" (${complaint.category})`,
          complaintId: complaint._id,
          metadata: { priority: complaint.priority },
        });
      }
    } catch (err) {
      console.warn(`[NotificationService:notifyComplaintCreated] ${err.message}`);
    }
  }

  /**
   * 2. Complaint Assigned
   */
  async notifyComplaintAssigned(complaint, staff, student) {
    try {
      // Notify staff
      await this.createNotification({
        recipientId: staff._id || staff,
        type: 'COMPLAINT_ASSIGNED',
        title: 'Task Assigned',
        message: `You have been assigned to complaint: "${complaint.title}" in ${complaint.location}.`,
        complaintId: complaint._id,
      });

      // Notify student
      const studentId = student?._id || complaint.createdBy;
      await this.createNotification({
        recipientId: studentId,
        type: 'COMPLAINT_ASSIGNED',
        title: 'Technician Assigned',
        message: `Technician ${staff.name} has been assigned to your ticket "${complaint.title}".`,
        complaintId: complaint._id,
      });

      // Send emails
      emailService.sendComplaintAssigned(complaint, staff, student);
    } catch (err) {
      console.warn(`[NotificationService:notifyComplaintAssigned] ${err.message}`);
    }
  }

  /**
   * 3. Complaint Status Changed
   */
  async notifyComplaintStatusChanged(complaint, student, newStatus, notes) {
    try {
      const studentId = student?._id || complaint.createdBy;
      await this.createNotification({
        recipientId: studentId,
        type: 'STATUS_CHANGED',
        title: 'Status Updated',
        message: `Complaint "${complaint.title}" is now marked as ${newStatus}.${notes ? ` (${notes})` : ''}`,
        complaintId: complaint._id,
        metadata: { newStatus },
      });

      // Send email
      if (student) {
        emailService.sendComplaintStatusChanged(complaint, student, newStatus, notes);
      }
    } catch (err) {
      console.warn(`[NotificationService:notifyComplaintStatusChanged] ${err.message}`);
    }
  }

  /**
   * 4. Complaint Resolved
   */
  async notifyComplaintResolved(complaint, student, resolutionNotes) {
    try {
      const studentId = student?._id || complaint.createdBy;
      await this.createNotification({
        recipientId: studentId,
        type: 'COMPLAINT_RESOLVED',
        title: 'Complaint Resolved',
        message: `Your complaint "${complaint.title}" was resolved. Please rate the service quality!`,
        complaintId: complaint._id,
        metadata: { resolutionNotes },
      });

      // Send email
      if (student) {
        emailService.sendComplaintResolved(complaint, student, resolutionNotes);
      }
    } catch (err) {
      console.warn(`[NotificationService:notifyComplaintResolved] ${err.message}`);
    }
  }

  /**
   * 5. Comment Added
   */
  async notifyCommentAdded(complaint, author, commentText) {
    try {
      const authorId = author._id.toString();
      const studentId = complaint.createdBy?._id
        ? complaint.createdBy._id.toString()
        : complaint.createdBy.toString();
      const staffId = complaint.assignedTo?._id
        ? complaint.assignedTo._id.toString()
        : complaint.assignedTo
        ? complaint.assignedTo.toString()
        : null;

      // If student commented -> notify assigned staff and admin
      if (authorId === studentId) {
        if (staffId) {
          const staffUser = await User.findById(staffId);
          await this.createNotification({
            recipientId: staffId,
            type: 'COMMENT_ADDED',
            title: 'New Student Comment',
            message: `${author.name} commented on "${complaint.title}": "${commentText.slice(0, 80)}"`,
            complaintId: complaint._id,
          });
          emailService.sendCommentNotification(staffUser, author, complaint, commentText);
        }
      } else {
        // Staff or Admin commented -> notify student
        const studentUser = await User.findById(studentId);
        await this.createNotification({
          recipientId: studentId,
          type: 'COMMENT_ADDED',
          title: 'New Reply on Your Ticket',
          message: `${author.name} (${author.role}) replied to "${complaint.title}": "${commentText.slice(0, 80)}"`,
          complaintId: complaint._id,
        });
        emailService.sendCommentNotification(studentUser, author, complaint, commentText);
      }
    } catch (err) {
      console.warn(`[NotificationService:notifyCommentAdded] ${err.message}`);
    }
  }

  /**
   * 6. Feedback Submitted
   */
  async notifyFeedbackSubmitted(complaint, student, feedback) {
    try {
      // Notify assigned staff
      if (complaint.assignedTo) {
        const staffId = complaint.assignedTo._id || complaint.assignedTo;
        await this.createNotification({
          recipientId: staffId,
          type: 'FEEDBACK_SUBMITTED',
          title: 'Resolution Feedback Received',
          message: `Student ${student.name} rated ticket "${complaint.title}" ${feedback.rating}/5 stars.`,
          complaintId: complaint._id,
          metadata: { rating: feedback.rating },
        });
      }

      // Notify admins
      const admins = await User.find({ role: 'admin' }).select('_id');
      for (const admin of admins) {
        await this.createNotification({
          recipientId: admin._id,
          type: 'FEEDBACK_SUBMITTED',
          title: 'Complaint Rated',
          message: `Ticket "${complaint.title}" rated ${feedback.rating}/5 stars by ${student.name}.`,
          complaintId: complaint._id,
          metadata: { rating: feedback.rating },
        });
      }
    } catch (err) {
      console.warn(`[NotificationService:notifyFeedbackSubmitted] ${err.message}`);
    }
  }
}

const notificationService = new NotificationService();

module.exports = notificationService;
