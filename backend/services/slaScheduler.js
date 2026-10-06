/**
 * Automated SLA Monitoring & Escalation Scheduler
 * Periodically inspects unresolved complaints, calculates real-time SLA states,
 * identifies at-risk tickets, flags breaches, and triggers multi-level escalations.
 * 
 * Multi-Replica Safe: Uses atomic MongoDB lease locking (SystemLock) so only
 * one pod in a multi-replica Kubernetes deployment runs the inspection per cycle.
 */

const Complaint = require('../models/Complaint');
const SystemLock = require('../models/SystemLock');
const { computeSlaStatus, calculateSlaDeadlines } = require('./slaService');
const notificationService = require('../utils/notificationService');
const {
  campuscareSlaAtRiskTotal,
  campuscareSlaBreachedTotal,
  campuscareSlaEscalationsTotal,
} = require('../metrics');

const LEASE_KEY = 'sla-monitoring-lease';
const LEASE_DURATION_MS = 50 * 1000; // 50 seconds lease
const DEFAULT_INTERVAL_MS = parseInt(process.env.SLA_CHECK_INTERVAL_MS || '60000', 10);
const SECOND_ESCALATION_MINUTES = parseInt(process.env.SECOND_ESCALATION_AFTER_BREACH_MINUTES || '120', 10);

const workerId = `worker-${process.pid}-${Math.random().toString(36).substring(2, 8)}`;

let schedulerInterval = null;

/**
 * Attempt to acquire or renew the distributed lease for SLA monitoring.
 */
async function acquireSlaLease(durationMs = LEASE_DURATION_MS) {
  try {
    const now = new Date();
    const lockedUntil = new Date(now.getTime() + durationMs);

    // Atomically find an expired lease or acquire existing
    const lock = await SystemLock.findOneAndUpdate(
      {
        lockKey: LEASE_KEY,
        $or: [
          { lockedUntil: { $lte: now } },
          { lockedBy: workerId },
        ],
      },
      {
        $set: {
          lockedUntil,
          lockedBy: workerId,
        },
      },
      { upsert: false, new: true }
    );

    if (lock && lock.lockedBy === workerId) {
      return true;
    }

    // Try upserting if no lock record exists at all
    const initialLock = await SystemLock.findOneAndUpdate(
      { lockKey: LEASE_KEY },
      {
        $setOnInsert: {
          lockKey: LEASE_KEY,
          lockedUntil,
          lockedBy: workerId,
        },
      },
      { upsert: true, new: true }
    );

    return initialLock && initialLock.lockedBy === workerId;
  } catch (err) {
    // Duplicate key race condition is expected when another replica acquires first
    return false;
  }
}

/**
 * Execute a single end-to-end SLA inspection cycle across all unresolved complaints.
 * 
 * @param {Object} [options]
 * @param {boolean} [options.bypassLock=false] - For manual test invocation
 * @returns {Promise<{ inspected: number, atRisk: number, breached: number, escalated: number }>}
 */
async function runSlaCheckOnce(options = {}) {
  const { bypassLock = false, now = new Date() } = options;

  if (!bypassLock) {
    const hasLease = await acquireSlaLease();
    if (!hasLease) {
      // Another pod or worker has the active monitoring lease
      return { skipped: true, reason: 'Lease held by another worker' };
    }
  }

  const stats = {
    inspected: 0,
    atRisk: 0,
    breached: 0,
    escalated: 0,
  };

  try {
    // Find all active, non-resolved complaints
    const complaints = await Complaint.find({ status: { $ne: 'RESOLVED' } })
      .populate('createdBy', 'name email studentId')
      .populate('assignedTo', 'name email');

    stats.inspected = complaints.length;

    for (const complaint of complaints) {
      let isModified = false;

      // Ensure SLA fields exist
      if (!complaint.sla || !complaint.sla.resolutionDeadline) {
        complaint.sla = calculateSlaDeadlines(complaint.priority, complaint.createdAt, complaint.sla);
        isModified = true;
      }

      const computed = computeSlaStatus(complaint, now);

      if (complaint.sla.status !== computed.status) {
        complaint.sla.status = computed.status;
        isModified = true;
      }

      complaint.sla.lastCheckedAt = now;
      isModified = true;

      // -------------------------------------------------------------
      // 1. AT_RISK Warning Detection
      // -------------------------------------------------------------
      if (computed.status === 'AT_RISK' && !complaint.sla.atRiskNotified) {
        complaint.sla.atRiskNotified = true;
        stats.atRisk++;
        isModified = true;

        complaint.activityTimeline.push({
          eventType: 'SLA_AT_RISK',
          actorName: 'System Automation',
          actorRole: 'system',
          message: `SLA resolution window at risk (~${computed.timeRemainingMinutes}m remaining). Priority flagged.`,
          timestamp: now,
          metadata: { remainingMinutes: computed.timeRemainingMinutes },
        });

        // Fire notifications (in-app + async email)
        await notificationService.notifySlaAtRisk(
          complaint,
          complaint.createdBy,
          complaint.assignedTo,
          computed.timeRemainingMinutes
        );

        campuscareSlaAtRiskTotal.inc({ priority: complaint.priority });
      }

      // -------------------------------------------------------------
      // 2. BREACHED Detection & Escalation Level 1
      // -------------------------------------------------------------
      if (computed.status === 'BREACHED' && !complaint.sla.breachNotified) {
        complaint.sla.breachNotified = true;
        complaint.sla.resolutionBreached = true;
        complaint.sla.escalated = true;
        complaint.sla.escalationLevel = 1;
        complaint.sla.escalatedAt = now;
        complaint.sla.escalation1Notified = true;
        stats.breached++;
        stats.escalated++;
        isModified = true;

        complaint.activityTimeline.push({
          eventType: 'SLA_BREACHED',
          actorName: 'System Automation',
          actorRole: 'system',
          message: 'Target resolution deadline exceeded. SLA breach recorded.',
          timestamp: now,
          metadata: { priority: complaint.priority },
        });

        complaint.activityTimeline.push({
          eventType: 'COMPLAINT_ESCALATED',
          actorName: 'System Automation',
          actorRole: 'system',
          message: 'Complaint escalated to Level 1 supervisory queue.',
          timestamp: now,
          metadata: { escalationLevel: 1 },
        });

        // Automated Priority Escalation (unless manually locked by Admin)
        if (complaint.prioritySource !== 'MANUAL' && complaint.priority !== 'CRITICAL') {
          const previousPriority = complaint.priority;
          let newPriority = previousPriority;

          if (previousPriority === 'LOW') newPriority = 'MEDIUM';
          else if (previousPriority === 'MEDIUM') newPriority = 'HIGH';
          else if (previousPriority === 'HIGH') newPriority = 'CRITICAL';

          if (newPriority !== previousPriority) {
            complaint.priority = newPriority;
            complaint.priorityReason = `Automatically escalated to ${newPriority} following SLA breach.`;

            complaint.activityTimeline.push({
              eventType: 'PRIORITY_CHANGED',
              actorName: 'System Automation',
              actorRole: 'system',
              message: `Priority automatically escalated from ${previousPriority} to ${newPriority} due to SLA breach.`,
              timestamp: now,
              metadata: { previousPriority, newPriority, reason: 'SLA Breach Auto-Escalation' },
            });
          }
        }

        // Fire notifications (in-app + async email)
        await notificationService.notifySlaBreached(
          complaint,
          complaint.createdBy,
          complaint.assignedTo,
          1
        );

        campuscareSlaBreachedTotal.inc({ priority: complaint.priority });
        campuscareSlaEscalationsTotal.inc({ level: '1' });
      }

      // -------------------------------------------------------------
      // 3. Escalation Level 2: Persistent Breach
      // -------------------------------------------------------------
      if (
        computed.status === 'BREACHED' &&
        complaint.sla.escalationLevel === 1 &&
        !complaint.sla.escalation2Notified
      ) {
        const breachDurationMinutes = (now.getTime() - new Date(complaint.sla.resolutionDeadline).getTime()) / (60 * 1000);

        if (breachDurationMinutes >= SECOND_ESCALATION_MINUTES) {
          complaint.sla.escalationLevel = 2;
          complaint.sla.escalation2Notified = true;
          stats.escalated++;
          isModified = true;

          complaint.activityTimeline.push({
            eventType: 'COMPLAINT_ESCALATED',
            actorName: 'System Automation',
            actorRole: 'system',
            message: 'Persistent delay: Complaint escalated to Level 2 Executive Director queue.',
            timestamp: now,
            metadata: {
              escalationLevel: 2,
              breachDurationMinutes: Math.round(breachDurationMinutes),
            },
          });

          await notificationService.notifySlaBreached(
            complaint,
            complaint.createdBy,
            complaint.assignedTo,
            2
          );

          campuscareSlaEscalationsTotal.inc({ level: '2' });
        }
      }

      if (isModified) {
        await complaint.save();
      }
    }
  } catch (error) {
    console.error(`[SlaScheduler] Error in monitoring cycle: ${error.message}`);
  }

  return stats;
}

/**
 * Start the recurring background SLA monitoring interval.
 */
function startSlaScheduler(intervalMs = DEFAULT_INTERVAL_MS) {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }

  console.log(`[SlaScheduler] Started periodic SLA monitor (Interval: ${intervalMs}ms, Worker: ${workerId})`);

  // Initial check after short delay
  setTimeout(() => {
    runSlaCheckOnce().catch((err) => {
      console.error(`[SlaScheduler:Initial] Run error: ${err.message}`);
    });
  }, 3000);

  schedulerInterval = setInterval(() => {
    runSlaCheckOnce().catch((err) => {
      console.error(`[SlaScheduler:Recurring] Run error: ${err.message}`);
    });
  }, intervalMs);

  // Prevent scheduler from holding test process open
  if (schedulerInterval.unref) {
    schedulerInterval.unref();
  }
}

/**
 * Stop the background SLA monitoring interval.
 */
function stopSlaScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[SlaScheduler] Stopped periodic SLA monitor.');
  }
}

module.exports = {
  startSlaScheduler,
  stopSlaScheduler,
  runSlaCheckOnce,
  acquireSlaLease,
  workerId,
};
