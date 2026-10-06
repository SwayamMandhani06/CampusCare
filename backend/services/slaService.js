/**
 * SLA Policy & Calculation Engine
 * Centralized service managing service level agreements, deadlines,
 * risk detection, and response/resolution tracking for CampusCare 2.0.
 */

// Centralized SLA Targets in Minutes
const SLA_POLICY = {
  CRITICAL: {
    responseTargetMinutes: 60,       // 1 hour
    resolutionTargetMinutes: 480,    // 8 hours
  },
  HIGH: {
    responseTargetMinutes: 240,      // 4 hours
    resolutionTargetMinutes: 1440,   // 24 hours (1 day)
  },
  MEDIUM: {
    responseTargetMinutes: 720,      // 12 hours
    resolutionTargetMinutes: 2880,   // 48 hours (2 days)
  },
  LOW: {
    responseTargetMinutes: 1440,     // 24 hours (1 day)
    resolutionTargetMinutes: 4320,   // 72 hours (3 days)
  },
};

/**
 * Calculate initial SLA object when a complaint is created or when priority changes.
 * 
 * @param {string} priority - 'LOW', 'MEDIUM', 'HIGH', or 'CRITICAL'
 * @param {Date} [startTime] - Complaint creation timestamp (defaults to now)
 * @param {Object} [existingSla] - Prior SLA state to preserve response progress
 * @returns {Object} Complete SLA object
 */
const calculateSlaDeadlines = (priority = 'MEDIUM', startTime = new Date(), existingSla = {}) => {
  const policy = SLA_POLICY[priority] || SLA_POLICY.MEDIUM;
  const startMs = new Date(startTime).getTime();

  const responseDeadline = new Date(startMs + policy.responseTargetMinutes * 60 * 1000);
  const resolutionDeadline = new Date(startMs + policy.resolutionTargetMinutes * 60 * 1000);

  return {
    responseTargetMinutes: policy.responseTargetMinutes,
    resolutionTargetMinutes: policy.resolutionTargetMinutes,
    responseDeadline,
    resolutionDeadline,
    responseAt: existingSla.responseAt || null,
    resolutionAt: existingSla.resolutionAt || null,
    responseBreached: existingSla.responseBreached || false,
    resolutionBreached: existingSla.resolutionBreached || false,
    status: existingSla.status || 'ON_TRACK',
    lastCheckedAt: new Date(),
    escalated: existingSla.escalated || false,
    escalationLevel: existingSla.escalationLevel || 0,
    escalatedAt: existingSla.escalatedAt || null,
    atRiskNotified: existingSla.atRiskNotified || false,
    breachNotified: existingSla.breachNotified || false,
    escalation1Notified: existingSla.escalation1Notified || false,
    escalation2Notified: existingSla.escalation2Notified || false,
  };
};

/**
 * Record First Response when an authorized staff or admin action takes place.
 * (e.g. status moved beyond PENDING, technician assigned, or staff comment added)
 * 
 * @param {Object} complaint - Mongoose Complaint document
 * @param {Date} [actionTime] - Timestamp of first response action
 * @returns {boolean} Whether response was recorded in this call
 */
const recordFirstResponse = (complaint, actionTime = new Date()) => {
  if (!complaint.sla) {
    complaint.sla = calculateSlaDeadlines(complaint.priority, complaint.createdAt);
  }

  // Only record the first response once
  if (!complaint.sla.responseAt) {
    complaint.sla.responseAt = actionTime;
    const deadlineMs = new Date(complaint.sla.responseDeadline).getTime();
    complaint.sla.responseBreached = actionTime.getTime() > deadlineMs;
    return true;
  }

  return false;
};

/**
 * Record Resolution when a complaint enters the RESOLVED state.
 * 
 * @param {Object} complaint - Mongoose Complaint document
 * @param {Date} [resolutionTime] - Timestamp of resolution
 * @returns {boolean} Whether resolution SLA was completed
 */
const recordResolution = (complaint, resolutionTime = new Date()) => {
  if (!complaint.sla) {
    complaint.sla = calculateSlaDeadlines(complaint.priority, complaint.createdAt);
  }

  if (!complaint.sla.resolutionAt) {
    complaint.sla.resolutionAt = resolutionTime;
    const deadlineMs = new Date(complaint.sla.resolutionDeadline).getTime();
    complaint.sla.resolutionBreached = resolutionTime.getTime() > deadlineMs;
    complaint.sla.status = 'RESOLVED';
    return true;
  }

  return false;
};

/**
 * Authoritatively compute the real-time SLA status and time remaining metrics.
 * 
 * @param {Object} complaint - Complaint document or plain object
 * @param {Date} [now] - Current evaluation timestamp
 * @returns {{
 *   status: string,
 *   timeRemainingMinutes: number,
 *   percentageElapsed: number,
 *   isDelayed: boolean,
 *   isBreached: boolean,
 *   isAtRisk: boolean,
 *   isResolved: boolean
 * }}
 */
const computeSlaStatus = (complaint, now = new Date()) => {
  const currentMs = new Date(now).getTime();

  // If already marked as RESOLVED or complaint status is RESOLVED
  if (complaint.status === 'RESOLVED' || (complaint.sla && complaint.sla.resolutionAt)) {
    return {
      status: 'RESOLVED',
      timeRemainingMinutes: 0,
      percentageElapsed: 100,
      isDelayed: complaint.sla?.resolutionBreached || false,
      isBreached: complaint.sla?.resolutionBreached || false,
      isAtRisk: false,
      isResolved: true,
    };
  }

  const sla = complaint.sla || calculateSlaDeadlines(complaint.priority, complaint.createdAt);
  const startMs = new Date(complaint.createdAt || now).getTime();
  const resolutionDeadlineMs = new Date(sla.resolutionDeadline || startMs + 2880 * 60 * 1000).getTime();
  const responseDeadlineMs = new Date(sla.responseDeadline || startMs + 720 * 60 * 1000).getTime();

  const totalDurationMs = resolutionDeadlineMs - startMs;
  const elapsedMs = Math.max(0, currentMs - startMs);
  const remainingMs = resolutionDeadlineMs - currentMs;

  const timeRemainingMinutes = Math.round(remainingMs / (60 * 1000));
  const percentageElapsed = totalDurationMs > 0
    ? Math.min(100, Math.round((elapsedMs / totalDurationMs) * 100))
    : 100;

  // Breach Condition: Passed resolution deadline OR (never responded and passed response deadline)
  const isResolutionBreached = currentMs > resolutionDeadlineMs;
  const isResponseBreached = !sla.responseAt && currentMs > responseDeadlineMs;

  let computedStatus = 'ON_TRACK';

  if (isResolutionBreached || isResponseBreached) {
    computedStatus = 'BREACHED';
  } else if (remainingMs > 0 && remainingMs / totalDurationMs <= 0.25) {
    // 25% or less time remaining until resolution deadline
    computedStatus = 'AT_RISK';
  } else {
    computedStatus = 'ON_TRACK';
  }

  return {
    status: computedStatus,
    timeRemainingMinutes,
    percentageElapsed,
    isDelayed: computedStatus === 'BREACHED' || computedStatus === 'AT_RISK',
    isBreached: computedStatus === 'BREACHED',
    isAtRisk: computedStatus === 'AT_RISK',
    isResolved: false,
  };
};

module.exports = {
  SLA_POLICY,
  calculateSlaDeadlines,
  recordFirstResponse,
  recordResolution,
  computeSlaStatus,
};
