/**
 * CampusCare Centralized Analytics Service
 * Provides high-performance server-side MongoDB aggregation pipelines for:
 * - Executive KPI Summary & Period-over-Period comparisons
 * - Historical Volume Trends (created vs resolved over time)
 * - Category, Priority, and Status distributions
 * - Service Level Agreement (SLA) compliance & escalation telemetry
 * - Maintenance Staff performance, active workload & SLA health
 * - Campus Location Hotspots
 * - Service Feedback ratings & student satisfaction
 * - Deterministic, rule-based operational insights
 * - Comprehensive CSV Report generation with CSV injection sanitization
 */

const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const User = require('../models/User');

/**
 * Parses date range parameter into exact UTC Date boundaries and prior period boundaries
 * @param {string} range - '7d', '30d', '90d', '6m', '1y', 'custom'
 * @param {string|null} customStart - ISO string or YYYY-MM-DD
 * @param {string|null} customEnd - ISO string or YYYY-MM-DD
 * @returns {object} { startDate, endDate, prevStartDate, prevEndDate, range, label, interval }
 */
const parseDateRange = (range = '30d', customStart = null, customEnd = null) => {
  const now = new Date();
  let endDate = new Date(now.getTime());
  let startDate = new Date(now.getTime());
  let label = 'Last 30 Days';
  let interval = 'day';

  switch (range) {
    case '7d':
      startDate.setUTCDate(startDate.getUTCDate() - 7);
      startDate.setUTCHours(0, 0, 0, 0);
      label = 'Last 7 Days';
      interval = 'day';
      break;

    case '90d':
      startDate.setUTCDate(startDate.getUTCDate() - 90);
      startDate.setUTCHours(0, 0, 0, 0);
      label = 'Last 90 Days';
      interval = 'week';
      break;

    case '6m':
      startDate.setUTCDate(startDate.getUTCDate() - 180);
      startDate.setUTCHours(0, 0, 0, 0);
      label = 'Last 6 Months';
      interval = 'week';
      break;

    case '1y':
      startDate.setUTCDate(startDate.getUTCDate() - 365);
      startDate.setUTCHours(0, 0, 0, 0);
      label = 'Last 1 Year';
      interval = 'month';
      break;

    case 'custom':
      if (customStart && customEnd) {
        const parsedStart = new Date(customStart);
        const parsedEnd = new Date(customEnd);

        if (!isNaN(parsedStart.getTime()) && !isNaN(parsedEnd.getTime()) && parsedStart <= parsedEnd) {
          startDate = parsedStart;
          startDate.setUTCHours(0, 0, 0, 0);
          endDate = parsedEnd;
          endDate.setUTCHours(23, 59, 59, 999);

          const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          label = `Custom (${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]})`;
          interval = diffDays <= 35 ? 'day' : diffDays <= 180 ? 'week' : 'month';
          break;
        }
      }
      // Fallback if custom dates are invalid
      startDate.setUTCDate(startDate.getUTCDate() - 30);
      startDate.setUTCHours(0, 0, 0, 0);
      label = 'Last 30 Days';
      interval = 'day';
      break;

    case '30d':
    default:
      startDate.setUTCDate(startDate.getUTCDate() - 30);
      startDate.setUTCHours(0, 0, 0, 0);
      label = 'Last 30 Days';
      interval = 'day';
      break;
  }

  // Calculate equivalent preceding period for period-over-period comparisons
  const durationMs = endDate.getTime() - startDate.getTime();
  const prevEndDate = new Date(startDate.getTime());
  const prevStartDate = new Date(startDate.getTime() - durationMs);

  return {
    range,
    startDate,
    endDate,
    prevStartDate,
    prevEndDate,
    label,
    interval,
    durationDays: Math.ceil(durationMs / (1000 * 60 * 60 * 24)),
  };
};

/**
 * Builds base MongoDB match query from filters and date window
 * @param {object} filters - { category, priority, status, slaStatus, location, assignedStaff }
 * @param {Date} start - Window start
 * @param {Date} end - Window end
 * @returns {object} MongoDB match object
 */
const buildAnalyticsMatchQuery = (filters = {}, start, end) => {
  const match = {
    createdAt: { $gte: start, $lte: end },
  };

  if (filters.category) {
    match.category = filters.category;
  }

  if (filters.priority) {
    match.priority = filters.priority.toUpperCase();
  }

  if (filters.status) {
    match.status = filters.status.toUpperCase();
  }

  if (filters.slaStatus) {
    match['sla.status'] = filters.slaStatus.toUpperCase();
  }

  if (filters.location) {
    match.location = { $regex: filters.location.trim(), $options: 'i' };
  }

  if (filters.assignedStaff) {
    if (filters.assignedStaff === 'unassigned') {
      match.assignedTo = null;
    } else if (mongoose.Types.ObjectId.isValid(filters.assignedStaff)) {
      match.assignedTo = new mongoose.Types.ObjectId(filters.assignedStaff);
    }
  }

  return match;
};

/**
 * Calculates deterministic, rule-based operational insights directly from analytics data
 * @param {object} data - Overview analytics dataset
 * @returns {string[]} Array of actionable insight strings
 */
const generateOperationalInsights = (data) => {
  const insights = [];
  const { summary, periodComparison, categoryDistribution, slaAnalytics, staffPerformance, locationHotspots } = data;

  // Fallback for empty or insufficient datasets
  if (!summary || summary.totalComplaints < 3) {
    return ['Not enough data to determine an operational trend.'];
  }

  // 1. Volume Period-over-Period Trend
  if (periodComparison && periodComparison.volumeChangePercent !== null) {
    const val = periodComparison.volumeChangePercent;
    if (val > 5) {
      insights.push(`Complaint volume increased by ${val.toFixed(1)}% compared with the previous equivalent period.`);
    } else if (val < -5) {
      insights.push(`Complaint volume decreased by ${Math.abs(val).toFixed(1)}% compared with the previous equivalent period.`);
    } else {
      insights.push(`Complaint volume remained stable with a minor ${Math.abs(val).toFixed(1)}% variance vs the previous period.`);
    }
  }

  // 2. Dominant Category Concentration
  if (categoryDistribution && categoryDistribution.length > 0) {
    const topCat = categoryDistribution[0];
    if (topCat.percentage >= 25) {
      insights.push(`${topCat.category} represents the largest operational share, accounting for ${topCat.percentage}% of all tickets (${topCat.count} complaints).`);
    }

    // Category with highest unresolved backlog
    const highestBacklogCat = [...categoryDistribution]
      .sort((a, b) => (b.count - b.resolved) - (a.count - a.resolved))[0];
    const activeInCat = highestBacklogCat.count - highestBacklogCat.resolved;
    if (activeInCat > 0) {
      insights.push(`${highestBacklogCat.category} currently holds the highest unresolved backlog with ${activeInCat} active open work orders.`);
    }

    // Category with highest SLA compliance (minimum 2 complaints)
    const compliantCats = categoryDistribution.filter((c) => c.resolved >= 2);
    if (compliantCats.length > 0) {
      const bestSlaCat = compliantCats.sort((a, b) => b.complianceRate - a.complianceRate)[0];
      insights.push(`SLA compliance is highest in ${bestSlaCat.category} at ${bestSlaCat.complianceRate}%.`);
    }
  }

  // 3. High-Priority Risk / SLA Breaches
  if (slaAnalytics) {
    if (slaAnalytics.breached > 0) {
      const breachRate = summary.totalComplaints > 0 ? ((slaAnalytics.breached / summary.totalComplaints) * 100).toFixed(1) : 0;
      insights.push(`Currently ${slaAnalytics.breached} complaints have breached SLA targets (${breachRate}% breach incidence rate).`);
    }

    if (slaAnalytics.escalations && slaAnalytics.escalations.total > 0) {
      insights.push(`Supervisory escalation triggered on ${slaAnalytics.escalations.total} ticket(s) (Level 1: ${slaAnalytics.escalations.level1}, Level 2: ${slaAnalytics.escalations.level2}).`);
    }

    if (periodComparison && periodComparison.slaCompliancePointChange !== null) {
      const ptChange = periodComparison.slaCompliancePointChange;
      if (Math.abs(ptChange) >= 1) {
        const direction = ptChange > 0 ? 'improved by' : 'declined by';
        insights.push(`Overall SLA compliance ${direction} ${Math.abs(ptChange).toFixed(1)} percentage points compared with the preceding period.`);
      }
    }
  }

  // 4. Staff Capacity & Workload Balance
  if (staffPerformance && staffPerformance.length > 0) {
    const overloaded = staffPerformance.filter((s) => s.activeCount >= 4);
    if (overloaded.length > 0) {
      const names = overloaded.map((s) => s.name).join(', ');
      insights.push(`${overloaded.length} technician(s) carry active workloads above recommended capacity (≥4 active tasks): ${names}.`);
    }
  }

  // 5. Facility Location Hotspots
  if (locationHotspots && locationHotspots.length > 0) {
    const topLoc = locationHotspots[0];
    if (topLoc.count >= 2) {
      insights.push(`Primary campus facility hotspot is '${topLoc.location}' with ${topLoc.count} reported issues.`);
    }
  }

  // 6. Quality & Duplicates
  if (data.qualityIntelligence && data.qualityIntelligence.duplicateCount > 0) {
    insights.push(`Duplicate issue detection flagged ${data.qualityIntelligence.duplicateCount} redundant submission(s) (${data.qualityIntelligence.duplicateRate}% duplicate rate), preventing dispatch duplication.`);
  }

  return insights.slice(0, 6);
};

/**
 * Aggregates complete analytics overview dataset matching specified filters and date range
 * @param {object} filters - Request query filters
 * @returns {Promise<object>} Complete consolidated analytics dataset
 */
const getAnalyticsOverview = async (filters = {}) => {
  const dateInfo = parseDateRange(filters.range, filters.startDate, filters.endDate);
  const currentMatch = buildAnalyticsMatchQuery(filters, dateInfo.startDate, dateInfo.endDate);
  const prevMatch = buildAnalyticsMatchQuery(filters, dateInfo.prevStartDate, dateInfo.prevEndDate);

  // Parallel Aggregation Pipeline execution
  const [
    currentStatsAgg,
    prevStatsAgg,
    volumeTrendsAgg,
    categoryAgg,
    priorityAgg,
    statusAgg,
    locationAgg,
    feedbackAgg,
    qualityAgg,
    staffMembers,
  ] = await Promise.all([
    // 1. Current Period Overview KPIs
    Complaint.aggregate([
      { $match: currentMatch },
      {
        $group: {
          _id: null,
          totalComplaints: { $sum: 1 },
          pendingCount: { $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] } },
          reviewedCount: { $sum: { $cond: [{ $eq: ['$status', 'REVIEWED'] }, 1, 0] } },
          assignedCount: { $sum: { $cond: [{ $eq: ['$status', 'ASSIGNED'] }, 1, 0] } },
          inProgressCount: { $sum: { $cond: [{ $eq: ['$status', 'IN_PROGRESS'] }, 1, 0] } },
          resolvedCount: { $sum: { $cond: [{ $eq: ['$status', 'RESOLVED'] }, 1, 0] } },
          onTrackCount: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ['$status', 'RESOLVED'] }, { $eq: ['$sla.status', 'ON_TRACK'] }] },
                1,
                0,
              ],
            },
          },
          atRiskCount: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ['$status', 'RESOLVED'] }, { $eq: ['$sla.status', 'AT_RISK'] }] },
                1,
                0,
              ],
            },
          },
          breachedCount: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$sla.status', 'BREACHED'] },
                    { $eq: ['$sla.resolutionBreached', true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          resolvedWithinSla: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'RESOLVED'] },
                    { $ne: ['$sla.resolutionBreached', true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          resolvedAfterSla: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'RESOLVED'] },
                    { $eq: ['$sla.resolutionBreached', true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          escalatedTotal: { $sum: { $cond: [{ $eq: ['$sla.escalated', true] }, 1, 0] } },
          escalatedLevel1: { $sum: { $cond: [{ $eq: ['$sla.escalationLevel', 1] }, 1, 0] } },
          escalatedLevel2: { $sum: { $cond: [{ $eq: ['$sla.escalationLevel', 2] }, 1, 0] } },
        },
      },
    ]),

    // 2. Previous Period KPIs (for comparison)
    Complaint.aggregate([
      { $match: prevMatch },
      {
        $group: {
          _id: null,
          totalComplaints: { $sum: 1 },
          resolvedCount: { $sum: { $cond: [{ $eq: ['$status', 'RESOLVED'] }, 1, 0] } },
          resolvedWithinSla: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'RESOLVED'] },
                    { $ne: ['$sla.resolutionBreached', true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),

    // 3. Volume Trends over time (Bucketed by Day/Week/Month)
    Complaint.aggregate([
      { $match: currentMatch },
      {
        $group: {
          _id: {
            $dateToString: {
              format: dateInfo.interval === 'day' ? '%Y-%m-%d' : dateInfo.interval === 'week' ? '%G-W%V' : '%Y-%m',
              date: '$createdAt',
            },
          },
          created: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'RESOLVED'] }, 1, 0] } },
          breached: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$sla.status', 'BREACHED'] },
                    { $eq: ['$sla.resolutionBreached', true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // 4. Category Breakdown
    Complaint.aggregate([
      { $match: currentMatch },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'RESOLVED'] }, 1, 0] } },
          resolvedWithinSla: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'RESOLVED'] },
                    { $ne: ['$sla.resolutionBreached', true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          breached: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$sla.status', 'BREACHED'] },
                    { $eq: ['$sla.resolutionBreached', true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { count: -1 } },
    ]),

    // 5. Priority Breakdown
    Complaint.aggregate([
      { $match: currentMatch },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 },
          breached: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$sla.status', 'BREACHED'] },
                    { $eq: ['$sla.resolutionBreached', true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { count: -1 } },
    ]),

    // 6. Status Breakdown
    Complaint.aggregate([
      { $match: currentMatch },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]),

    // 7. Location Hotspots (Top 10)
    Complaint.aggregate([
      { $match: currentMatch },
      {
        $group: {
          _id: '$location',
          count: { $sum: 1 },
          highPriorityCount: {
            $sum: {
              $cond: [
                { $in: ['$priority', ['HIGH', 'CRITICAL']] },
                1,
                0,
              ],
            },
          },
          breachCount: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$sla.status', 'BREACHED'] },
                    { $eq: ['$sla.resolutionBreached', true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),

    // 8. Feedback Analytics
    Complaint.aggregate([
      {
        $match: {
          ...currentMatch,
          'feedback.rating': { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: null,
          totalRatings: { $sum: 1 },
          avgRating: { $avg: '$feedback.rating' },
          star5: { $sum: { $cond: [{ $eq: ['$feedback.rating', 5] }, 1, 0] } },
          star4: { $sum: { $cond: [{ $eq: ['$feedback.rating', 4] }, 1, 0] } },
          star3: { $sum: { $cond: [{ $eq: ['$feedback.rating', 3] }, 1, 0] } },
          star2: { $sum: { $cond: [{ $eq: ['$feedback.rating', 2] }, 1, 0] } },
          star1: { $sum: { $cond: [{ $eq: ['$feedback.rating', 1] }, 1, 0] } },
        },
      },
    ]),

    // 9. Quality & Intelligence
    Complaint.aggregate([
      { $match: currentMatch },
      {
        $group: {
          _id: null,
          duplicateCount: { $sum: { $cond: [{ $eq: ['$duplicateDetected', true] }, 1, 0] } },
          aiCount: { $sum: { $cond: [{ $eq: ['$classificationSource', 'AI'] }, 1, 0] } },
          ruleBasedCount: { $sum: { $cond: [{ $eq: ['$classificationSource', 'RULE_BASED'] }, 1, 0] } },
          manualOverrideCount: { $sum: { $cond: [{ $eq: ['$prioritySource', 'MANUAL'] }, 1, 0] } },
        },
      },
    ]),

    // 10. All Staff Members Directory
    User.find({ role: 'staff' }).select('name email studentId').lean(),
  ]);

  // Resolution duration aggregation for current & previous period
  const [currResolvedDocs, prevResolvedDocs] = await Promise.all([
    Complaint.find({
      ...currentMatch,
      status: 'RESOLVED',
    })
      .select('createdAt updatedAt sla')
      .lean(),
    Complaint.find({
      ...prevMatch,
      status: 'RESOLVED',
    })
      .select('createdAt updatedAt sla')
      .lean(),
  ]);

  // Compute average & median resolution time (hours)
  const calculateResolutionHours = (docs) => {
    if (!docs || docs.length === 0) return { avg: 0, median: 0 };
    const durations = docs
      .map((d) => {
        const resolvedAt = d.sla?.resolutionAt || d.updatedAt;
        if (!resolvedAt) return null;
        return (new Date(resolvedAt).getTime() - new Date(d.createdAt).getTime()) / (1000 * 60 * 60);
      })
      .filter((h) => h !== null && h >= 0);

    if (durations.length === 0) return { avg: 0, median: 0 };
    durations.sort((a, b) => a - b);
    const avg = durations.reduce((sum, v) => sum + v, 0) / durations.length;
    const mid = Math.floor(durations.length / 2);
    const median = durations.length % 2 !== 0 ? durations[mid] : (durations[mid - 1] + durations[mid]) / 2;
    return {
      avg: Number(avg.toFixed(1)),
      median: Number(median.toFixed(1)),
    };
  };

  const currResolutionTime = calculateResolutionHours(currResolvedDocs);
  const prevResolutionTime = calculateResolutionHours(prevResolvedDocs);

  // Compute Average Response Time (minutes)
  const respondedDocs = await Complaint.find({
    ...currentMatch,
    'sla.responseAt': { $exists: true, $ne: null },
  })
    .select('createdAt sla.responseAt')
    .lean();

  let avgResponseMinutes = 0;
  if (respondedDocs.length > 0) {
    const totalMinutes = respondedDocs.reduce((acc, d) => {
      const mins = (new Date(d.sla.responseAt).getTime() - new Date(d.createdAt).getTime()) / (1000 * 60);
      return acc + (mins >= 0 ? mins : 0);
    }, 0);
    avgResponseMinutes = Math.round(totalMinutes / respondedDocs.length);
  }

  // Format Current Stats
  const currStats = currentStatsAgg[0] || {
    totalComplaints: 0,
    pendingCount: 0,
    reviewedCount: 0,
    assignedCount: 0,
    inProgressCount: 0,
    resolvedCount: 0,
    onTrackCount: 0,
    atRiskCount: 0,
    breachedCount: 0,
    resolvedWithinSla: 0,
    resolvedAfterSla: 0,
    escalatedTotal: 0,
    escalatedLevel1: 0,
    escalatedLevel2: 0,
  };

  const prevStats = prevStatsAgg[0] || {
    totalComplaints: 0,
    resolvedCount: 0,
    resolvedWithinSla: 0,
  };

  const total = currStats.totalComplaints;
  const activeCount = currStats.pendingCount + currStats.reviewedCount + currStats.assignedCount + currStats.inProgressCount;
  const resolvedCount = currStats.resolvedCount;
  const slaComplianceRate = resolvedCount > 0 ? Math.round((currStats.resolvedWithinSla / resolvedCount) * 100) : 100;

  const prevSlaComplianceRate = prevStats.resolvedCount > 0 ? Math.round((prevStats.resolvedWithinSla / prevStats.resolvedCount) * 100) : 100;

  // Period Comparisons
  const volumeChangePercent = prevStats.totalComplaints > 0
    ? Number((((total - prevStats.totalComplaints) / prevStats.totalComplaints) * 100).toFixed(1))
    : total > 0 ? 100 : 0;

  const resolutionTimeChangePercent = prevResolutionTime.avg > 0
    ? Number((((currResolutionTime.avg - prevResolutionTime.avg) / prevResolutionTime.avg) * 100).toFixed(1))
    : 0;

  const slaCompliancePointChange = Number((slaComplianceRate - prevSlaComplianceRate).toFixed(1));

  // Staff Performance Aggregation
  const staffTaskMap = {};
  for (const s of staffMembers) {
    staffTaskMap[s._id.toString()] = {
      staffId: s._id,
      name: s.name,
      email: s.email,
      assignedCount: 0,
      activeCount: 0,
      resolvedCount: 0,
      breachedCount: 0,
      resolvedWithinSla: 0,
      resolutionDurations: [],
    };
  }

  const staffComplaints = await Complaint.find({
    ...currentMatch,
    assignedTo: { $ne: null },
  })
    .select('assignedTo status createdAt updatedAt sla')
    .lean();

  for (const c of staffComplaints) {
    const sId = c.assignedTo.toString();
    if (staffTaskMap[sId]) {
      const item = staffTaskMap[sId];
      item.assignedCount++;
      if (['ASSIGNED', 'IN_PROGRESS'].includes(c.status)) {
        item.activeCount++;
      }
      if (c.status === 'RESOLVED') {
        item.resolvedCount++;
        if (!c.sla?.resolutionBreached) {
          item.resolvedWithinSla++;
        }
        const resolvedAt = c.sla?.resolutionAt || c.updatedAt;
        if (resolvedAt) {
          const hours = (new Date(resolvedAt).getTime() - new Date(c.createdAt).getTime()) / (1000 * 3600);
          if (hours >= 0) item.resolutionDurations.push(hours);
        }
      }
      if (c.sla?.status === 'BREACHED' || c.sla?.resolutionBreached) {
        item.breachedCount++;
      }
    }
  }

  const staffPerformance = Object.values(staffTaskMap).map((s) => {
    const avgRes = s.resolutionDurations.length > 0
      ? Number((s.resolutionDurations.reduce((acc, h) => acc + h, 0) / s.resolutionDurations.length).toFixed(1))
      : 0;
    const slaComp = s.resolvedCount > 0 ? Math.round((s.resolvedWithinSla / s.resolvedCount) * 100) : 100;
    const completionRate = s.assignedCount > 0 ? Math.round((s.resolvedCount / s.assignedCount) * 100) : 0;

    return {
      staffId: s.staffId,
      name: s.name,
      email: s.email,
      assignedCount: s.assignedCount,
      activeCount: s.activeCount,
      resolvedCount: s.resolvedCount,
      breachedCount: s.breachedCount,
      slaComplianceRate: slaComp,
      completionRate,
      avgResolutionHours: avgRes,
    };
  });

  staffPerformance.sort((a, b) => b.assignedCount - a.assignedCount);

  // Category Distribution with percentages
  const categoryDistribution = categoryAgg.map((c) => ({
    category: c._id || 'Uncategorized',
    count: c.count,
    resolved: c.resolved,
    breached: c.breached,
    percentage: total > 0 ? Math.round((c.count / total) * 100) : 0,
    complianceRate: c.resolved > 0 ? Math.round((c.resolvedWithinSla / c.resolved) * 100) : 100,
  }));

  // Priority Distribution with percentages
  const priorityDistribution = priorityAgg.map((p) => ({
    priority: p._id || 'MEDIUM',
    count: p.count,
    breached: p.breached,
    percentage: total > 0 ? Math.round((p.count / total) * 100) : 0,
  }));

  // Status Distribution with percentages
  const statusDistribution = statusAgg.map((s) => ({
    status: s._id || 'PENDING',
    count: s.count,
    percentage: total > 0 ? Math.round((s.count / total) * 100) : 0,
  }));

  // Location Hotspots
  const locationHotspots = locationAgg.map((l) => ({
    location: l._id || 'Main Campus',
    count: l.count,
    highPriorityCount: l.highPriorityCount,
    breachCount: l.breachCount,
  }));

  // Feedback Metrics
  const fb = feedbackAgg[0] || {
    totalRatings: 0,
    avgRating: 0,
    star5: 0,
    star4: 0,
    star3: 0,
    star2: 0,
    star1: 0,
  };

  const feedbackAnalytics = {
    totalRatings: fb.totalRatings,
    avgRating: fb.totalRatings > 0 ? Number(fb.avgRating.toFixed(1)) : 0,
    averageRating: fb.totalRatings > 0 ? Number(fb.avgRating.toFixed(1)) : 0,
    feedbackRate: resolvedCount > 0 ? Math.round((fb.totalRatings / resolvedCount) * 100) : 0,
    breakdown: {
      5: fb.star5,
      4: fb.star4,
      3: fb.star3,
      2: fb.star2,
      1: fb.star1,
    },
    distribution: [
      { stars: 5, count: fb.star5 },
      { stars: 4, count: fb.star4 },
      { stars: 3, count: fb.star3 },
      { stars: 2, count: fb.star2 },
      { stars: 1, count: fb.star1 },
    ],
  };

  // Quality & Intelligence Metrics
  const qi = qualityAgg[0] || {
    duplicateCount: 0,
    aiCount: 0,
    ruleBasedCount: 0,
    manualOverrideCount: 0,
  };

  const qualityIntelligence = {
    duplicateCount: qi.duplicateCount,
    duplicateRate: total > 0 ? Math.round((qi.duplicateCount / total) * 100) : 0,
    aiClassifiedCount: qi.aiCount,
    ruleBasedCount: qi.ruleBasedCount,
    manualOverrideCount: qi.manualOverrideCount,
    manualOverrideRate: total > 0 ? Math.round((qi.manualOverrideCount / total) * 100) : 0,
  };

  // SLA Telemetry Breakdown
  const slaAnalytics = {
    totalManaged: total,
    onTrack: currStats.onTrackCount,
    atRisk: currStats.atRiskCount,
    breached: currStats.breachedCount,
    resolvedWithinSla: currStats.resolvedWithinSla,
    resolvedAfterSla: currStats.resolvedAfterSla,
    compliancePercentage: slaComplianceRate,
    avgResponseTimeMinutes: avgResponseMinutes,
    avgResolutionTimeHours: currResolutionTime.avg,
    medianResolutionTimeHours: currResolutionTime.median,
    escalations: {
      total: currStats.escalatedTotal,
      level1: currStats.escalatedLevel1,
      level2: currStats.escalatedLevel2,
    },
  };

  // Consolidated Output Object
  const overviewData = {
    period: {
      range: dateInfo.range,
      label: dateInfo.label,
      startDate: dateInfo.startDate.toISOString(),
      endDate: dateInfo.endDate.toISOString(),
      prevStartDate: dateInfo.prevStartDate.toISOString(),
      prevEndDate: dateInfo.prevEndDate.toISOString(),
      interval: dateInfo.interval,
      durationDays: dateInfo.durationDays,
    },
    summary: {
      totalComplaints: total,
      activeComplaints: activeCount,
      activeBacklog: activeCount,
      resolvedComplaints: resolvedCount,
      backlogCount: activeCount,
      slaComplianceRate,
      avgResolutionHours: currResolutionTime.avg,
      medianResolutionHours: currResolutionTime.median,
      avgResponseMinutes,
      escalatedCount: currStats.escalatedTotal,
      breachedCount: currStats.breachedCount,
      atRiskCount: currStats.atRiskCount,
      onTrackCount: currStats.onTrackCount,
    },
    periodComparison: {
      volumeChangePercent,
      resolutionTimeChangePercent,
      slaCompliancePointChange,
      prevTotalComplaints: prevStats.totalComplaints,
      prevResolvedComplaints: prevStats.resolvedCount,
      prevAvgResolutionHours: prevResolutionTime.avg,
      prevSlaComplianceRate,
    },
    volumeTrends: volumeTrendsAgg.map((item) => ({
      date: item._id,
      created: item.created,
      resolved: item.resolved,
      breached: item.breached,
    })),
    categoryDistribution,
    priorityDistribution,
    statusDistribution,
    slaAnalytics,
    staffPerformance,
    locationHotspots,
    feedbackAnalytics,
    qualityIntelligence,
  };

  // Generate deterministic operational insights
  overviewData.operationalInsights = generateOperationalInsights(overviewData);

  return overviewData;
};

/**
 * Sanitizes cell values to prevent CSV formula injection
 * @param {any} val
 * @returns {string}
 */
const sanitizeCsvCell = (val) => {
  if (val === null || val === undefined) return '';
  let str = String(val).trim();
  // Escape formula trigger characters (=, +, -, @, \t, \r)
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  // Wrap in quotes if containing comma, quote, or newline
  if (/[",\n\r]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Formats a complete, multi-section executive operational CSV report
 * @param {object} data - Analytics overview dataset
 * @returns {string} CSV text content
 */
const formatAnalyticsCsvReport = (data) => {
  const lines = [];

  // SECTION 1: HEADER & METADATA
  lines.push('CAMPUSCARE 2.0 — OPERATIONAL ANALYTICS REPORT');
  lines.push(`Report Range,${sanitizeCsvCell(data.period.label)}`);
  lines.push(`Start Date (UTC),${sanitizeCsvCell(data.period.startDate)}`);
  lines.push(`End Date (UTC),${sanitizeCsvCell(data.period.endDate)}`);
  lines.push(`Generated At,${sanitizeCsvCell(new Date().toISOString())}`);
  lines.push('');

  // SECTION 2: EXECUTIVE SUMMARY & PERIOD-OVER-PERIOD COMPARISON
  lines.push('--- EXECUTIVE OPERATIONAL KPI SUMMARY ---');
  lines.push('Metric,Current Period,Previous Period,Change');
  lines.push(
    `Total Complaints,${data.summary.totalComplaints},${data.periodComparison.prevTotalComplaints},${data.periodComparison.volumeChangePercent !== null ? data.periodComparison.volumeChangePercent + '%' : 'N/A'}`
  );
  lines.push(
    `Resolved Complaints,${data.summary.resolvedComplaints},${data.periodComparison.prevResolvedComplaints},—`
  );
  lines.push(
    `Active Backlog,${data.summary.activeComplaints},—,—`
  );
  lines.push(
    `SLA Compliance Rate,${data.summary.slaComplianceRate}%,${data.periodComparison.prevSlaComplianceRate}%,${data.periodComparison.slaCompliancePointChange > 0 ? '+' : ''}${data.periodComparison.slaCompliancePointChange} pts`
  );
  lines.push(
    `Average Resolution Time (Hours),${data.summary.avgResolutionHours}h,${data.periodComparison.prevAvgResolutionHours}h,${data.periodComparison.resolutionTimeChangePercent !== null ? data.periodComparison.resolutionTimeChangePercent + '%' : 'N/A'}`
  );
  lines.push(
    `Average Response Time (Minutes),${data.summary.avgResponseMinutes}m,—,—`
  );
  lines.push(
    `Escalated Tickets,${data.summary.escalatedCount},—,—`
  );
  lines.push('');

  // SECTION 2B: VOLUME TRENDS
  lines.push('--- COMPLAINT VOLUME TRENDS ---');
  lines.push('Date / Interval,Created,Resolved,Breached');
  if (data.volumeTrends && data.volumeTrends.length > 0) {
    for (const vt of data.volumeTrends) {
      lines.push(`${sanitizeCsvCell(vt.date)},${vt.created},${vt.resolved},${vt.breached}`);
    }
  } else {
    lines.push('No volume trend data in selected window,0,0,0');
  }
  lines.push('');

  // SECTION 3: CATEGORY PERFORMANCE
  lines.push('--- CATEGORY BREAKDOWN & SLA HEALTH ---');
  lines.push('Category,Total Complaints,Share %,Resolved,Breached,SLA Compliance %');
  for (const c of data.categoryDistribution) {
    lines.push(
      `${sanitizeCsvCell(c.category)},${c.count},${c.percentage}%,${c.resolved},${c.breached},${c.complianceRate}%`
    );
  }
  lines.push('');

  // SECTION 4: PRIORITY DISTRIBUTION
  lines.push('--- PRIORITY DISTRIBUTION ---');
  lines.push('Priority,Count,Share %,Breached');
  for (const p of data.priorityDistribution) {
    lines.push(
      `${sanitizeCsvCell(p.priority)},${p.count},${p.percentage}%,${p.breached}`
    );
  }
  lines.push('');

  // SECTION 5: SLA PERFORMANCE
  lines.push('--- SLA PERFORMANCE METRICS ---');
  lines.push(`Total SLA Managed,${data.slaAnalytics.totalManaged}`);
  lines.push(`On Track,${data.slaAnalytics.onTrack}`);
  lines.push(`At Risk,${data.slaAnalytics.atRisk}`);
  lines.push(`Breached,${data.slaAnalytics.breached}`);
  lines.push(`Resolved Within Target,${data.slaAnalytics.resolvedWithinSla}`);
  lines.push(`Resolved Overdue,${data.slaAnalytics.resolvedAfterSla}`);
  lines.push(`SLA Compliance Rate,${data.slaAnalytics.compliancePercentage}%`);
  lines.push(`Level 1 Escalations,${data.slaAnalytics.escalations.level1}`);
  lines.push(`Level 2 Escalations,${data.slaAnalytics.escalations.level2}`);
  lines.push('');

  // SECTION 6: STAFF PERFORMANCE
  lines.push('--- TECHNICIAN & STAFF PERFORMANCE ---');
  lines.push('Name,Email,Assigned,Active,Resolved,Breached,SLA Compliance %,Completion Rate %,Avg Resolution (Hours)');
  for (const s of data.staffPerformance) {
    lines.push(
      `${sanitizeCsvCell(s.name)},${sanitizeCsvCell(s.email)},${s.assignedCount},${s.activeCount},${s.resolvedCount},${s.breachedCount},${s.slaComplianceRate}%,${s.completionRate}%,${s.avgResolutionHours}h`
    );
  }
  lines.push('');

  // SECTION 7: CAMPUS FACILITY HOTSPOTS
  lines.push('--- CAMPUS LOCATION HOTSPOTS (TOP 10) ---');
  lines.push('Location,Total Complaints,High/Critical Count,SLA Breaches');
  for (const l of data.locationHotspots) {
    lines.push(
      `${sanitizeCsvCell(l.location)},${l.count},${l.highPriorityCount},${l.breachCount}`
    );
  }
  lines.push('');

  // SECTION 8: OPERATIONAL INSIGHTS
  lines.push('--- DETERMINISTIC OPERATIONAL INSIGHTS ---');
  if (data.operationalInsights && data.operationalInsights.length > 0) {
    for (const ins of data.operationalInsights) {
      lines.push(`${sanitizeCsvCell(ins)}`);
    }
  } else {
    lines.push('Not enough data to determine an operational trend.');
  }

  return lines.join('\r\n');
};

module.exports = {
  parseDateRange,
  buildAnalyticsMatchQuery,
  generateOperationalInsights,
  getAnalyticsOverview,
  formatAnalyticsCsvReport,
  sanitizeCsvCell,
};
