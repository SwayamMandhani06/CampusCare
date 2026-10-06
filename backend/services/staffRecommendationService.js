/**
 * CampusCare Smart Staff Recommendation Service
 * Evaluates campus facility staff based on trade specialization, current active workload,
 * complaint urgency, and SLA performance to generate explainable match scores.
 */
const User = require('../models/User');
const Complaint = require('../models/Complaint');
const { campuscareStaffRecommendationRequestsTotal } = require('../metrics');

/**
 * Category to trade specialization keyword mapping
 */
const CATEGORY_SPECIALIZATION_MAP = {
  'Electrical': ['electrical', 'electric', 'power', 'wiring'],
  'Plumbing': ['plumbing', 'water', 'pipe', 'drain', 'leak'],
  'Classroom Infrastructure': ['electrical', 'furniture', 'facilities', 'civil'],
  'Laboratory Equipment': ['electrical', 'it', 'facilities', 'network'],
  'Hostel Facilities': ['plumbing', 'electrical', 'cleaning', 'facilities'],
  'Civil & Maintenance': ['civil', 'carpentry', 'furniture', 'masonry'],
  'Housekeeping & Cleanliness': ['cleaning', 'housekeeping', 'hygiene'],
  'Security & Access': ['security', 'access', 'gate', 'lock'],
  'Network & IT Support': ['it', 'network', 'wifi', 'computer'],
  'Sports & Amenities': ['facilities', 'civil', 'furniture'],
  'Other / Miscellaneous': ['facilities', 'lead'],
};

/**
 * Evaluates specialization fit (0 to 50 points)
 * @param {object} staff - Staff user document
 * @param {string} category - Complaint category
 * @returns {{ score: number, reason: string }}
 */
const evaluateSpecialization = (staff, category = '') => {
  const staffDetails = `${staff.name} ${staff.email}`.toLowerCase();
  const categoryKeywords = CATEGORY_SPECIALIZATION_MAP[category] || ['facilities', 'lead'];

  // Check direct category name in staff title (e.g. Electrical)
  const categoryLower = category.toLowerCase();
  if (categoryLower && staffDetails.includes(categoryLower.split(' ')[0])) {
    return { score: 50, reason: `Direct trade specialization for ${category}` };
  }

  // Check keyword matches
  for (const kw of categoryKeywords) {
    if (staffDetails.includes(kw)) {
      return { score: 45, reason: `Relevant technical expertise (${kw})` };
    }
  }

  // Facilities lead or general staff fallback
  if (staffDetails.includes('lead') || staffDetails.includes('facilities')) {
    return { score: 35, reason: 'Senior facilities lead with cross-domain capability' };
  }

  return { score: 15, reason: 'General campus maintenance personnel' };
};

/**
 * Evaluates active workload capacity (0 to 30 points)
 * @param {number} activeCount - Number of currently assigned unresolved tasks
 * @returns {{ score: number, reason: string }}
 */
const evaluateWorkload = (activeCount) => {
  if (activeCount === 0) {
    return { score: 30, reason: 'Available with zero active tickets' };
  }
  if (activeCount === 1) {
    return { score: 25, reason: 'Light workload (1 active ticket)' };
  }
  if (activeCount === 2) {
    return { score: 20, reason: 'Moderate workload (2 active tickets)' };
  }
  if (activeCount === 3) {
    return { score: 12, reason: 'Busy workload (3 active tickets)' };
  }
  return { score: 5, reason: `High workload (${activeCount} active tickets)` };
};

/**
 * Evaluates SLA health and priority fit (0 to 20 points)
 * @param {number} breachedCount - Number of breached tickets currently on staff queue
 * @param {string} priority - Ticket priority
 * @param {object} staff - Staff user
 * @returns {{ score: number, reason: string }}
 */
const evaluateSlaHealth = (breachedCount, priority, staff) => {
  let score = 15;
  const reasons = [];

  if (breachedCount === 0) {
    reasons.push('Zero breached tickets');
  } else {
    score = Math.max(0, score - breachedCount * 5);
    reasons.push(`${breachedCount} delayed tickets in queue`);
  }

  // For CRITICAL priority, give bonus to Leads or technicians with clean SLA
  if (priority === 'CRITICAL') {
    if (staff.name.includes('Lead') || staff.email.includes('lead')) {
      score += 5;
      reasons.push('Leadership dispatch for critical emergency');
    }
  }

  return { score: Math.min(20, score), reason: reasons.join(', ') };
};

/**
 * Generates ranked, explainable staff recommendations for a complaint
 * @param {object|string} complaintOrId - Complaint document or ObjectId
 * @returns {Promise<Array>} Ranked recommendation list
 */
const recommendStaffForComplaint = async (complaintOrId) => {
  campuscareStaffRecommendationRequestsTotal.inc();

  let complaint = complaintOrId;
  if (typeof complaintOrId === 'string' || (complaintOrId && complaintOrId._bsontype === 'ObjectID')) {
    complaint = await Complaint.findById(complaintOrId);
  } else if (complaintOrId && !complaintOrId.category && complaintOrId._id) {
    complaint = await Complaint.findById(complaintOrId._id);
  }

  if (!complaint) {
    return [];
  }

  // 1. Fetch all active staff members
  const staffMembers = await User.find({ role: 'staff' }).select('name email studentId').lean();

  if (!staffMembers || staffMembers.length === 0) {
    return [];
  }

  // 2. Fetch workload summary for all staff members in parallel
  const staffIds = staffMembers.map((s) => s._id);

  // Active tasks count
  const activeTasksAgg = await Complaint.aggregate([
    {
      $match: {
        assignedTo: { $in: staffIds },
        status: { $in: ['ASSIGNED', 'IN_PROGRESS'] },
      },
    },
    {
      $group: {
        _id: '$assignedTo',
        activeCount: { $sum: 1 },
        breachedCount: {
          $sum: { $cond: [{ $eq: ['$sla.status', 'BREACHED'] }, 1, 0] },
        },
      },
    },
  ]);

  const workloadMap = {};
  for (const item of activeTasksAgg) {
    workloadMap[item._id.toString()] = {
      activeCount: item.activeCount || 0,
      breachedCount: item.breachedCount || 0,
    };
  }

  // 3. Score each staff member
  const recommendations = staffMembers.map((staff) => {
    const staffIdStr = staff._id.toString();
    const workload = workloadMap[staffIdStr] || { activeCount: 0, breachedCount: 0 };

    const specResult = evaluateSpecialization(staff, complaint.category);
    const workResult = evaluateWorkload(workload.activeCount);
    const slaResult = evaluateSlaHealth(workload.breachedCount, complaint.priority, staff);

    const totalScore = specResult.score + workResult.score + slaResult.score;
    const matchPercentage = Math.min(100, Math.max(10, totalScore));

    const explainableReasons = [
      specResult.reason,
      workResult.reason,
      slaResult.reason,
    ].filter(Boolean);

    return {
      staffId: staff._id,
      name: staff.name,
      email: staff.email,
      matchScore: matchPercentage,
      score: matchPercentage,
      staff: {
        _id: staff._id,
        id: staff._id,
        name: staff.name,
        email: staff.email,
      },
      activeTasks: workload.activeCount,
      breachedTasks: workload.breachedCount,
      isCurrentlyAssigned: complaint.assignedTo?.toString() === staffIdStr,
      reasons: explainableReasons,
      reason: explainableReasons.join(' | '),
      matchSummary: `${matchPercentage}% Match — ${specResult.reason} (${workResult.reason})`,
      breakdown: {
        categoryScore: specResult.score,
        workloadScore: workResult.score,
        slaScore: slaResult.score,
        activeWorkload: workload.activeCount,
        totalScore,
      },
    };
  });

  // Sort descending by match score
  recommendations.sort((a, b) => b.matchScore - a.matchScore);

  return recommendations;
};

module.exports = {
  recommendStaffForComplaint,
  getRecommendationsForComplaint: recommendStaffForComplaint,
  evaluateSpecialization,
  evaluateWorkload,
  evaluateSlaHealth,
};
