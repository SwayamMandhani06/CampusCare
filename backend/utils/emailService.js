/**
 * Email Notification Service
 * Provider-agnostic SMTP implementation using Nodemailer.
 * Completely optional: Disabled by default (EMAIL_ENABLED=false).
 * Never blocks or fails API operations when email sending encounters issues.
 */
const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initTransporter();
  }

  initTransporter() {
    const isEnabled = process.env.EMAIL_ENABLED === 'true';

    if (!isEnabled) {
      this.transporter = null;
      return;
    }

    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;

    if (!host || !user) {
      console.log('[EmailService] SMTP credentials not fully configured. Email notifications disabled.');
      this.transporter = null;
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass,
        },
      });
      console.log('[EmailService] SMTP Transporter initialized successfully.');
    } catch (err) {
      console.error('[EmailService] Failed to initialize SMTP transporter:', err.message);
      this.transporter = null;
    }
  }

  /**
   * Safely dispatches email asynchronously in a non-blocking background queue.
   */
  async sendMailAsync({ to, subject, text, html }) {
    // Non-blocking fire-and-forget
    setImmediate(async () => {
      if (process.env.EMAIL_ENABLED !== 'true' || !this.transporter) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[EmailService:Simulated] To: ${to} | Subject: "${subject}" | Content: ${text.slice(0, 100)}...`);
        }
        return;
      }

      try {
        const fromAddress = process.env.EMAIL_FROM || '"CampusCare Facilities" <no-reply@campuscare.local>';
        await this.transporter.sendMail({
          from: fromAddress,
          to,
          subject: `[CampusCare] ${subject}`,
          text,
          html,
        });
        console.log(`[EmailService] Notification sent to ${to} (${subject})`);
      } catch (error) {
        // Never throw; log cleanly
        console.warn(`[EmailService] Non-blocking delivery failed to ${to}: ${error.message}`);
      }
    });
  }

  // --- Predefined Reusable Templates ---

  sendComplaintCreated(complaint, student) {
    if (!student?.email) return;
    const subject = `Complaint Submitted: #${complaint._id.toString().slice(-6)} - ${complaint.title}`;
    const text = `Hello ${student.name},\n\nYour complaint has been successfully registered in CampusCare.\n\nTicket ID: #${complaint._id}\nTitle: ${complaint.title}\nCategory: ${complaint.category}\nLocation: ${complaint.location}\nPriority: ${complaint.priority}\nStatus: PENDING\n\nOur administrative team will review this shortly.\n\nBest regards,\nCampusCare Facilities Team`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #3d5a80; margin-top: 0;">CampusCare Facility Management</h2>
        <p>Hello <strong>${student.name}</strong>,</p>
        <p>Your complaint has been successfully submitted and logged into the campus facility tracker.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #edf2f7; color: #718096;">Ticket ID:</td><td style="padding: 8px; border-bottom: 1px solid #edf2f7; font-weight: 600;">#${complaint._id}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #edf2f7; color: #718096;">Title:</td><td style="padding: 8px; border-bottom: 1px solid #edf2f7;">${complaint.title}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #edf2f7; color: #718096;">Category:</td><td style="padding: 8px; border-bottom: 1px solid #edf2f7;">${complaint.category}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #edf2f7; color: #718096;">Location:</td><td style="padding: 8px; border-bottom: 1px solid #edf2f7;">${complaint.location}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #edf2f7; color: #718096;">Priority:</td><td style="padding: 8px; border-bottom: 1px solid #edf2f7;">${complaint.priority}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #edf2f7; color: #718096;">Current Status:</td><td style="padding: 8px; border-bottom: 1px solid #edf2f7; color: #8a8f98; font-weight: bold;">PENDING</td></tr>
        </table>
        <p style="font-size: 13px; color: #718096;">You will receive automated updates as facilities personnel review and resolve this request.</p>
      </div>
    `;
    this.sendMailAsync({ to: student.email, subject, text, html });
  }

  sendComplaintAssigned(complaint, staff, student) {
    // Notify staff
    if (staff?.email) {
      const subject = `Task Assigned: #${complaint._id.toString().slice(-6)} - ${complaint.title}`;
      const text = `Hello ${staff.name},\n\nA campus facility complaint has been assigned to you.\n\nTicket: #${complaint._id}\nTitle: ${complaint.title}\nCategory: ${complaint.category}\nLocation: ${complaint.location}\nPriority: ${complaint.priority}\n\nPlease inspect the issue and begin work.\n\nBest regards,\nCampusCare Facilities Team`;
      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #3d5a80; margin-top: 0;">New Task Assignment</h2>
          <p>Hello <strong>${staff.name}</strong>,</p>
          <p>A new maintenance task has been assigned to your department queue.</p>
          <div style="background-color: #f7fafc; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Issue:</strong> ${complaint.title}</p>
            <p style="margin: 0 0 8px 0;"><strong>Category:</strong> ${complaint.category}</p>
            <p style="margin: 0 0 8px 0;"><strong>Location:</strong> ${complaint.location}</p>
            <p style="margin: 0;"><strong>Priority:</strong> <span style="color: #c2683d; font-weight: bold;">${complaint.priority}</span></p>
          </div>
          <p style="font-size: 13px; color: #718096;">Please log into your Staff Workbench to update the task status once on-site.</p>
        </div>
      `;
      this.sendMailAsync({ to: staff.email, subject, text, html });
    }

    // Notify student that staff was assigned
    if (student?.email) {
      const subject = `Technician Assigned to Your Complaint #${complaint._id.toString().slice(-6)}`;
      const text = `Hello ${student.name},\n\nYour complaint has been assigned to technician ${staff.name}.\n\nTicket: #${complaint._id}\nTitle: ${complaint.title}\nTechnician: ${staff.name} (${staff.email})\n\nBest regards,\nCampusCare Team`;
      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #3d5a80; margin-top: 0;">Technician Assigned</h2>
          <p>Hello <strong>${student.name}</strong>,</p>
          <p>Your complaint has been reviewed and assigned to technician <strong>${staff.name}</strong>.</p>
          <p style="font-size: 13px; color: #718096;">You will receive notification when the technician commences work on-site.</p>
        </div>
      `;
      this.sendMailAsync({ to: student.email, subject, text, html });
    }
  }

  sendComplaintStatusChanged(complaint, student, newStatus, notes) {
    if (!student?.email) return;
    const subject = `Status Update: #${complaint._id.toString().slice(-6)} is now ${newStatus}`;
    const text = `Hello ${student.name},\n\nThe status of your complaint has changed to: ${newStatus}\n\nTicket: #${complaint._id}\nTitle: ${complaint.title}\nNotes: ${notes || 'Status updated by maintenance personnel'}\n\nBest regards,\nCampusCare Team`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #3d5a80; margin-top: 0;">Complaint Status Update</h2>
        <p>Hello <strong>${student.name}</strong>,</p>
        <p>The status of your complaint has been updated to: <strong style="color: #3d5a80;">${newStatus}</strong>.</p>
        ${notes ? `<p style="background: #f7fafc; padding: 12px; border-left: 3px solid #3d5a80; font-size: 13px;">${notes}</p>` : ''}
        <p style="font-size: 13px; color: #718096;">Check your student portal for live progress and technician comments.</p>
      </div>
    `;
    this.sendMailAsync({ to: student.email, subject, text, html });
  }

  sendComplaintResolved(complaint, student, resolutionNotes) {
    if (!student?.email) return;
    const subject = `Resolved: #${complaint._id.toString().slice(-6)} - ${complaint.title}`;
    const text = `Hello ${student.name},\n\nGreat news! Your complaint has been marked as RESOLVED.\n\nTicket: #${complaint._id}\nTitle: ${complaint.title}\nResolution Notes: ${resolutionNotes || 'Resolved by facility technician'}\n\nPlease visit CampusCare to review the resolution and submit your feedback/rating.\n\nBest regards,\nCampusCare Team`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #6b8f71; margin-top: 0;">Complaint Resolved</h2>
        <p>Hello <strong>${student.name}</strong>,</p>
        <p>Your reported issue has been marked as <strong>RESOLVED</strong> by the facilities staff.</p>
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <p style="margin: 0; font-size: 13px; color: #166534;"><strong>Resolution Notes:</strong><br/>${resolutionNotes || 'Work completed successfully.'}</p>
        </div>
        <p style="font-size: 13px; color: #718096;">Please log into CampusCare to confirm resolution and rate the service quality.</p>
      </div>
    `;
    this.sendMailAsync({ to: student.email, subject, text, html });
  }

  sendCommentNotification(recipient, author, complaint, commentText) {
    if (!recipient?.email) return;
    const subject = `New Comment on #${complaint._id.toString().slice(-6)} by ${author.name}`;
    const text = `Hello ${recipient.name},\n\n${author.name} (${author.role}) added a new comment to complaint #${complaint._id}:\n\n"${commentText}"\n\nLog in to CampusCare to reply.\n\nBest regards,\nCampusCare Team`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #3d5a80; margin-top: 0;">New Comment on Ticket #${complaint._id.toString().slice(-6)}</h2>
        <p>Hello <strong>${recipient.name}</strong>,</p>
        <p><strong>${author.name}</strong> (${author.role}) commented on <em>"${complaint.title}"</em>:</p>
        <div style="background-color: #f8fafc; border-left: 3px solid #3d5a80; padding: 12px 16px; margin: 16px 0; font-size: 14px;">
          ${commentText}
        </div>
        <p style="font-size: 13px; color: #718096;">Visit your CampusCare portal to view the discussion thread and reply.</p>
      </div>
    `;
    this.sendMailAsync({ to: recipient.email, subject, text, html });
  }

  sendSlaAtRisk(recipient, complaint, remainingMinutes) {
    if (!recipient?.email) return;
    const subject = `[URGENT] SLA At Risk: Ticket #${complaint._id.toString().slice(-6)}`;
    const text = `Hello ${recipient.name},\n\nComplaint #${complaint._id} ("${complaint.title}") is approaching its SLA resolution deadline.\nEstimated time remaining: ${remainingMinutes} minutes.\n\nPlease attend to this issue promptly.\n\nBest regards,\nCampusCare Facilities Team`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #b45309; margin-top: 0;">⚠️ SLA Target At Risk: #${complaint._id.toString().slice(-6)}</h2>
        <p>Hello <strong>${recipient.name}</strong>,</p>
        <p>Ticket <em>"${complaint.title}"</em> has entered the <strong>AT RISK</strong> zone with less than 25% resolution time remaining.</p>
        <div style="background-color: #fffbeb; border: 1px solid #fef3c7; padding: 12px 16px; margin: 16px 0; font-size: 13px; border-radius: 6px;">
          <p style="margin: 0;"><strong>Location:</strong> ${complaint.location}</p>
          <p style="margin: 4px 0 0;"><strong>Estimated Time Remaining:</strong> ~${remainingMinutes} minutes</p>
        </div>
        <p style="font-size: 13px; color: #718096;">Please log into CampusCare to review the ticket and expedite resolution.</p>
      </div>
    `;
    this.sendMailAsync({ to: recipient.email, subject, text, html });
  }

  sendSlaBreached(recipient, complaint, escalationLevel) {
    if (!recipient?.email) return;
    const subject = `[ESCALATION L${escalationLevel}] SLA Breached: Ticket #${complaint._id.toString().slice(-6)}`;
    const text = `Attention ${recipient.name},\n\nComplaint #${complaint._id} ("${complaint.title}") has breached its SLA resolution deadline and has been escalated to Level ${escalationLevel}.\n\nImmediate supervisory intervention required.\n\nCampusCare Operations`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #b91c1c; margin-top: 0;">🚨 SLA Breached & Escalated (Level ${escalationLevel})</h2>
        <p>Attention <strong>${recipient.name}</strong>,</p>
        <p>Complaint <strong>#${complaint._id.toString().slice(-6)}</strong> (<em>${complaint.title}</em>) has exceeded its SLA resolution deadline.</p>
        <div style="background-color: #fef2f2; border: 1px solid #fee2e2; padding: 12px 16px; margin: 16px 0; font-size: 13px; border-radius: 6px;">
          <p style="margin: 0; color: #991b1b;"><strong>Status:</strong> ESCALATED (Level ${escalationLevel})</p>
          <p style="margin: 4px 0 0;"><strong>Priority:</strong> ${complaint.priority}</p>
          <p style="margin: 4px 0 0;"><strong>Location:</strong> ${complaint.location}</p>
        </div>
        <p style="font-size: 13px; color: #718096;">Please review the ticket on the CampusCare console immediately.</p>
      </div>
    `;
    this.sendMailAsync({ to: recipient.email, subject, text, html });
  }

  sendPriorityChanged(recipient, complaint, previousPriority, newPriority, reason) {
    if (!recipient?.email) return;
    const subject = `Priority Updated to ${newPriority}: Ticket #${complaint._id.toString().slice(-6)}`;
    const text = `Hello ${recipient.name},\n\nThe priority for ticket #${complaint._id} ("${complaint.title}") was changed from ${previousPriority} to ${newPriority}.\nReason: ${reason}\n\nCampusCare Team`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #3d5a80; margin-top: 0;">Priority Updated: #${complaint._id.toString().slice(-6)}</h2>
        <p>Hello <strong>${recipient.name}</strong>,</p>
        <p>The priority level for ticket <em>"${complaint.title}"</em> was updated from <strong>${previousPriority}</strong> to <strong>${newPriority}</strong>.</p>
        <p style="font-size: 13px; color: #4a5568;"><strong>Reason:</strong> ${reason}</p>
      </div>
    `;
    this.sendMailAsync({ to: recipient.email, subject, text, html });
  }
}

const emailService = new EmailService();

module.exports = emailService;
