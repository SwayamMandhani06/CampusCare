/**
 * Priority Automation Service
 * Deterministic rule-based priority engine for CampusCare 2.0.
 * Classifies complaints into LOW, MEDIUM, HIGH, or CRITICAL based on:
 * - Safety & hazard heuristics (electrical, fire, structural, flooding)
 * - Academic & critical facility impact (laboratories, exam halls, servers)
 * - Scope & population impact (entire floors, wings, high-occupancy zones)
 * - Equipment & fixture type (audiovisual, sanitary, illumination, furniture)
 */

// 1. Life Safety & Emergency Hazard Patterns -> CRITICAL
const CRITICAL_PATTERNS = [
  { pattern: /\b(electric(al)? shock|short circuit|live wire|spark(ing|s)?|naked wire|electrocution)\b/i, reason: 'Potential electrical safety hazard or exposed live wiring detected.' },
  { pattern: /\b(fire|smoke|burning smell|gas leak|cylinder leak|chemical spill)\b/i, reason: 'Active fire, toxic smoke, or chemical hazard detected.' },
  { pattern: /\b(ceiling collaps|structural crack|roof caving|falling concrete|slab fall)\b/i, reason: 'Severe structural danger or ceiling collapse risk detected.' },
  { pattern: /\b(major flood(ing)?|severe flood(ing)?|flash flood|submersion|pipe burst|main pipe rupture|water tank burst)\b/i, reason: 'Major flooding or pressurized water pipe burst emergency.' },
  { pattern: /\b(transformer (burn|blast|explosion)|substation failure|total campus blackout)\b/i, reason: 'Central power substation or transformer emergency detected.' },
  { pattern: /\b(lift entrapment|elevator stuck|trapped in (lift|elevator))\b/i, reason: 'Passenger entrapped in campus elevator or lift mechanism.' },
  { pattern: /\b(medical emergency|severe injur(y|ed)|bleeding hazard)\b/i, reason: 'Immediate personal safety or bodily injury hazard reported.' },
];

// 2. High Academic & Large-Area Impact Patterns -> HIGH
const HIGH_PATTERNS = [
  { pattern: /\b(server room|data center|datacenter|hpc cluster|core switch)\b/i, reason: 'Critical IT server infrastructure or central data center disruption.' },
  { pattern: /\b(exam(ination)? hall|midterm|semester exam|viva|final presentation)\b/i, reason: 'Disrupts scheduled academic examinations or official evaluations.' },
  { pattern: /\b(chemistry lab|physics lab|biotech lab|robotics lab|research lab)\b/i, reason: 'Disrupts specialized scientific or technical laboratory operations.' },
  { pattern: /\b(entire (floor|wing|block|hostel|building)|campus(-|\s)wide|complete outage)\b/i, reason: 'Affects an entire floor, hostel wing, or high-occupancy zone.' },
  { pattern: /\b(no internet|packet loss|wifi down|switch failure|gateway down|dns down)\b/i, reason: 'Substantial network connectivity outage impacting multiple students.' },
  { pattern: /\b(drinking water (empty|contaminated|smell|foul|muddy)|no water supply)\b/i, reason: 'Interruption of clean drinking water supply across campus facilities.' },
  { pattern: /\b(auditorium|seminar hall|central library)\b/i, reason: 'High-capacity academic assembly or central research facility impacted.' },
  { pattern: /\b(water leakage|roof seepage|water seepage)\b/i, reason: 'Continuous water seepage threatening structural or electronic equipment damage.' },
  { pattern: /\b(cctv failure|security camera down|perimeter gate|access controller)\b/i, reason: 'Campus perimeter security or surveillance blind spot reported.' },
];

// 3. Routine Classroom & Sanitary Maintenance Patterns -> MEDIUM
const MEDIUM_PATTERNS = [
  { pattern: /\b(projector|smart(-|\s)board|hdmi|av cable|microphone|speaker|podium amp)\b/i, reason: 'Classroom audiovisual hardware or presentation equipment defect.' },
  { pattern: /\b(fan|tubelight|light|bulb|ac|air conditioner|split ac|cooling unit)\b/i, reason: 'Routine classroom/room climate control or illumination fixture repair.' },
  { pattern: /\b(washroom|restroom|toilet|urinal|flush|tap|faucet|basin|drainage)\b/i, reason: 'Standard sanitary fixture or washroom drainage maintenance.' },
  { pattern: /\b(door lock|door handle|latch|window latch|key stuck)\b/i, reason: 'Room hardware or door locking mechanism maintenance.' },
  { pattern: /\b(water cooler|refrigeration unit|dispenser)\b/i, reason: 'Water cooling unit or drinking water dispenser servicing required.' },
];

// 4. Minor Cosmetic, Furniture & Housekeeping Patterns -> LOW
const LOW_PATTERNS = [
  { pattern: /\b(chair|desk|table|bench|podium|whiteboard|blackboard|chalkboard)\b/i, reason: 'Standard classroom furniture repair or ergonomic adjustment needed.' },
  { pattern: /\b(dustbin|litter|trash|garbage|sweeping|cleaning|mop|spill)\b/i, reason: 'Routine housekeeping, cleaning, or dustbin clearance request.' },
  { pattern: /\b(curtain|blind|paint|scratch|dent|cosmetic|notice board|bulletin)\b/i, reason: 'Minor cosmetic or non-critical facility maintenance request.' },
  { pattern: /\b(loose tile|loose screw|loose handle|squeak(y)?)\b/i, reason: 'Minor hardware tightening or minor fixture repair.' },
];

// Category Baseline Fallbacks when text does not match specific keyword patterns
const CATEGORY_DEFAULTS = {
  'Electrical': { priority: 'MEDIUM', reason: 'Routine electrical fixture inspection and servicing.' },
  'Plumbing': { priority: 'MEDIUM', reason: 'Standard plumbing fixture or water line maintenance.' },
  'Internet/WiFi': { priority: 'MEDIUM', reason: 'Routine network connectivity diagnostic request.' },
  'Equipment': { priority: 'MEDIUM', reason: 'General campus equipment maintenance and review.' },
  'Classroom Infrastructure': { priority: 'MEDIUM', reason: 'Classroom academic infrastructure servicing.' },
  'Hostel Maintenance': { priority: 'MEDIUM', reason: 'Hostel residential facility maintenance request.' },
  'Cleanliness': { priority: 'LOW', reason: 'General campus housekeeping or sanitation request.' },
  'Furniture': { priority: 'LOW', reason: 'Standard campus furniture maintenance.' },
  'Other': { priority: 'LOW', reason: 'General non-critical campus facility request.' },
};

/**
 * Deterministically evaluate complaint priority and generate justification reason.
 * 
 * @param {Object} complaintData
 * @param {string} [complaintData.title]
 * @param {string} [complaintData.description]
 * @param {string} [complaintData.category]
 * @param {string} [complaintData.location]
 * @returns {{ priority: string, priorityReason: string }}
 */
const evaluatePriority = ({ title = '', description = '', category = 'Other', location = '' }) => {
  const combinedText = `${title} ${description} ${location}`.trim();

  // 1. Check Critical Hazards
  for (const item of CRITICAL_PATTERNS) {
    if (item.pattern.test(combinedText)) {
      return { priority: 'CRITICAL', priorityReason: item.reason };
    }
  }

  // 2. Check High Impact
  for (const item of HIGH_PATTERNS) {
    if (item.pattern.test(combinedText)) {
      return { priority: 'HIGH', priorityReason: item.reason };
    }
  }

  // 3. Check Medium Fixture Maintenance
  for (const item of MEDIUM_PATTERNS) {
    if (item.pattern.test(combinedText)) {
      return { priority: 'MEDIUM', priorityReason: item.reason };
    }
  }

  // 4. Check Low Cosmetic / Housekeeping
  for (const item of LOW_PATTERNS) {
    if (item.pattern.test(combinedText)) {
      return { priority: 'LOW', priorityReason: item.reason };
    }
  }

  // 5. Category-based fallback
  const fallback = CATEGORY_DEFAULTS[category] || {
    priority: 'LOW',
    reason: 'Standard non-urgent campus facility maintenance request.',
  };

  return { priority: fallback.priority, priorityReason: fallback.reason };
};

module.exports = {
  evaluatePriority,
  CRITICAL_PATTERNS,
  HIGH_PATTERNS,
  MEDIUM_PATTERNS,
  LOW_PATTERNS,
};
