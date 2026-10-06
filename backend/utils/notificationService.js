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

  /**
   * 7. SLA At Risk Warning
   */
  async notifySlaAtRisk(complaint, student, staff, remainingMinutes) {
    try {
      const ticketNum = complaint._id.toString().slice(-6).toUpperCase();

      // Notify student
      if (student?._id) {
        await this.createNotification({
          recipientId: student._id,
          type: 'SLA_AT_RISK',
          title: `Status Notice: #${ticketNum}`,
          message: `Your ticket "${complaint.title}" is in progress and receiving priority attention to ensure timely resolution.`,
          complaintId: complaint._id,
          metadata: { remainingMinutes },
        });
        emailService.sendSlaAtRisk(student, complaint, remainingMinutes);
      }

      // Notify technician
      if (staff?._id) {
        await this.createNotification({
          recipientId: staff._id,
          type: 'SLA_AT_RISK',
          title: `⚠️ Task At Risk: #${ticketNum}`,
          message: `Work order "${complaint.title}" has less than 25% time remaining (~${remainingMinutes}m). Please prioritize.`,
          complaintId: complaint._id,
          metadata: { remainingMinutes },
        });
        emailService.sendSlaAtRisk(staff, complaint, remainingMinutes);
      }
    } catch (err) {
      console.warn(`[NotificationService:notifySlaAtRisk] ${err.message}`);
    }
  }

  /**
   * 8. SLA Breached & Escalated
   */
  async notifySlaBreached(complaint, student, staff, escalationLevel = 1) {
    try {
      const ticketNum = complaint._id.toString().slice(-6).toUpperCase();

      // Notify student
      if (student?._id) {
        await this.createNotification({
          recipientId: student._id,
          type: 'SLA_BREACH',
          title: `Ticket Update: #${ticketNum}`,
          message: `Resolution for your ticket "${complaint.title}" has taken longer than planned and has been escalated to campus supervisors.`,
          complaintId: complaint._id,
          metadata: { escalationLevel },
        });
        emailService.sendSlaBreached(student, complaint, escalationLevel);
      }

      // Notify assigned staff
      if (staff?._id) {
        await this.createNotification({
          recipientId: staff._id,
          type: 'SLA_BREACH',
          title: `🚨 SLA Breached: #${ticketNum}`,
          message: `Work order "${complaint.title}" has breached resolution deadline and escalated to Level ${escalationLevel}.`,
          complaintId: complaint._id,
          metadata: { escalationLevel },
        });
        emailService.sendSlaBreached(staff, complaint, escalationLevel);
      }

      // Notify all admins
      const admins = await User.find({ role: 'admin' }).select('_id name email');
      for (const admin of admins) {
        await this.createNotification({
          recipientId: admin._id,
          type: 'SLA_BREACH',
          title: `🚨 Escalation (Level ${escalationLevel}): #${ticketNum}`,
          message: `Ticket #${ticketNum} (${complaint.title}) at ${complaint.location} breached SLA. Urgency: ${complaint.priority}.`,
          complaintId: complaint._id,
          metadata: { escalationLevel, priority: complaint.priority },
        });
        emailService.sendSlaBreached(admin, complaint, escalationLevel);
      }
    } catch (err) {
      console.warn(`[NotificationService:notifySlaBreached] ${err.message}`);
    }
  }

  /**
   * 9. Priority Changed
   */
  async notifyPriorityChanged(complaint, student, staff, previousPriority, newPriority, reason) {
    try {
      const ticketNum = complaint._id.toString().slice(-6).toUpperCase();

      // Notify student
      if (student?._id) {
        await this.createNotification({
          recipientId: student._id,
          type: 'PRIORITY_CHANGED',
          title: `Priority Updated: #${ticketNum}`,
          message: `Urgency level for "${complaint.title}" adjusted to ${newPriority}. Reason: ${reason}`,
          complaintId: complaint._id,
          metadata: { previousPriority, newPriority, reason },
        });
        emailService.sendPriorityChanged(student, complaint, previousPriority, newPriority, reason);
      }

      // Notify assigned staff
      if (staff?._id) {
        await this.createNotification({
          recipientId: staff._id,
          type: 'PRIORITY_CHANGED',
          title: `Priority Updated: #${ticketNum}`,
          message: `Assigned task "${complaint.title}" priority is now ${newPriority}. Reason: ${reason}`,
          complaintId: complaint._id,
          metadata: { previousPriority, newPriority, reason },
        });
        emailService.sendPriorityChanged(staff, complaint, previousPriority, newPriority, reason);
      }
    } catch (err) {
      console.warn(`[NotificationService:notifyPriorityChanged] ${err.message}`);
    }
  }
}

const notificationService = new NotificationService();

module.exports = notificationService;
