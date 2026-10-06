/**
 * CampusCare Duplicate Complaint Detection Service
 * Lightweight, explainable duplicate issue detection using bounded candidate sets
 * and multi-factor lexical & metadata similarity scoring.
 */
const Complaint = require('../models/Complaint');
const { extractKeywords } = require('./classificationService');
const { campuscareDuplicateChecksTotal } = require('../metrics');

/**
 * Normalizes text for clean token comparison
 * @param {string} str
 * @returns {string}
 */
const normalizeText = (str = '') => {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Computes Jaccard token similarity coefficient between two strings
 * @param {string} textA
 * @param {string} textB
 * @returns {number} Score between 0.0 and 1.0
 */
const calculateJaccardSimilarity = (textA, textB) => {
  const setA = new Set(normalizeText(textA).split(' ').filter((w) => w.length > 2));
  const setB = new Set(normalizeText(textB).split(' ').filter((w) => w.length > 2));

  if (setA.size === 0 || setB.size === 0) return 0;

  let intersectionCount = 0;
  for (const token of setA) {
    if (setB.has(token)) {
      intersectionCount++;
    }
  }

  const unionSize = setA.size + setB.size - intersectionCount;
  return unionSize > 0 ? intersectionCount / unionSize : 0;
};

/**
 * Evaluates similarity between an incoming complaint and an existing complaint
 * @param {object} incoming - { title, description, category, location }
 * @param {object} existing - Existing Complaint document
 * @returns {{ similarityScore: number, matchReason: string }}
 */
const compareComplaints = (incoming, existing) => {
  const titleSim = calculateJaccardSimilarity(incoming.title, existing.title);
  const descSim = calculateJaccardSimilarity(incoming.description, existing.description);

  // Textual overlap (60% weight)
  const textScore = titleSim * 0.4 + descSim * 0.2;

  // Location overlap (25% weight)
  const incomingLoc = normalizeText(incoming.location);
  const existingLoc = normalizeText(existing.location);
  let locationScore = 0;
  let locationMatch = false;

  if (incomingLoc === existingLoc && incomingLoc.length > 0) {
    locationScore = 0.25;
    locationMatch = true;
  } else {
    const locSim = calculateJaccardSimilarity(incoming.location, existing.location);
    if (locSim > 0.4) {
      locationScore = 0.25 * locSim;
      locationMatch = true;
    }
  }

  // Category match (15% weight)
  let categoryScore = 0;
  let categoryMatch = false;
  if (
    incoming.category &&
    existing.category &&
    incoming.category.toLowerCase() === existing.category.toLowerCase()
  ) {
    categoryScore = 0.15;
    categoryMatch = true;
  }

  const compositeScore = Math.min(1.0, textScore + locationScore + categoryScore);
  const percentage = Math.round(compositeScore * 100);

  // Formulate clear, explainable match reason
  const reasons = [];
  if (locationMatch) reasons.push('Matching location');
  if (categoryMatch) reasons.push('Same category');
  if (titleSim > 0.4) reasons.push('High title similarity');
  if (descSim > 0.3) reasons.push('Similar issue description');

  const matchReason = `${percentage}% Match: ${reasons.join(', ') || 'General issue similarity'}`;

  return {
    similarityScore: Math.round(compositeScore * 100) / 100,
    matchReason,
  };
};

/**
 * Scans recent active complaints for possible duplicates of the incoming submission
 * @param {object} complaintData - { title, description, category, location }
 * @param {string} [excludeId] - Optional complaint ID to ignore (self when editing)
 * @returns {Promise<{ duplicateDetected: boolean, candidates: Array }>}
 */
const findDuplicateCandidates = async (complaintData, excludeId = null) => {
  const lookbackDays = parseInt(process.env.DUPLICATE_LOOKBACK_DAYS, 10) || 30;
  const threshold = parseFloat(process.env.DUPLICATE_SIMILARITY_THRESHOLD) || 0.65;
  const cutoffDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

  const query = {
    status: { $ne: 'RESOLVED' },
    createdAt: { $gte: cutoffDate },
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  // Bounded candidate pool: Unresolved tickets in the last lookbackDays
  const candidatePool = await Complaint.find(query)
    .select('_id title description category location status priority createdAt createdBy')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  const candidates = [];

  for (const existing of candidatePool) {
    const { similarityScore, matchReason } = compareComplaints(complaintData, existing);

    if (similarityScore >= threshold) {
      candidates.push({
        _id: existing._id,
        id: existing._id,
        title: existing.title,
        description: existing.description,
        category: existing.category,
        location: existing.location,
        status: existing.status,
        priority: existing.priority,
        createdAt: existing.createdAt,
        createdBy: existing.createdBy?.name || 'Fellow Student',
        similarityScore,
        score: similarityScore,
        matchReason,
        reason: matchReason,
      });
    }
  }

  // Sort descending by highest similarity score
  candidates.sort((a, b) => b.similarityScore - a.similarityScore);

  const duplicateDetected = candidates.length > 0;
  campuscareDuplicateChecksTotal.inc({ result: duplicateDetected ? 'duplicate_found' : 'unique' });

  return {
    duplicateDetected,
    hasDuplicates: duplicateDetected,
    candidates: candidates.slice(0, 5), // Top 5 closest matches
  };
};

module.exports = {
  findDuplicateCandidates,
  checkDuplicates: findDuplicateCandidates,
  compareComplaints,
  computeComplaintSimilarity: compareComplaints,
  calculateJaccardSimilarity,
};
