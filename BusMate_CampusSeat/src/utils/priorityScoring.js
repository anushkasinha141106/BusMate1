/**
 * priorityScoring.js
 * Multi-factor priority allocation engine evaluating passenger Age, Travel Purpose,
 * and Physical Vulnerability / Mobility Needs for fair transit seating allocation.
 */

export const TRIP_PURPOSES = {
  MEDICAL: {
    id: 'MEDICAL',
    label: 'Medical / Doctor Visit',
    icon: '🏥',
    weight: 50,
    description: 'Hospital, clinic appointment, dialysis, or emergency consultation'
  },
  EDUCATION_EXAM: {
    id: 'EDUCATION_EXAM',
    label: 'Student / College / Exam Travel',
    icon: '🎓',
    weight: 35,
    description: 'School, university lecture, competitive entrance or board exams'
  },
  WORK_COMMUTE: {
    id: 'WORK_COMMUTE',
    label: 'Work / Office Commute',
    icon: '💼',
    weight: 20,
    description: 'Daily office reporting, shift transit, or business appointments'
  },
  GENERAL_LEISURE: {
    id: 'GENERAL_LEISURE',
    label: 'General / Personal Trip',
    icon: '🚶',
    weight: 5,
    description: 'Social visit, recreation, shopping, or flexible personal transit'
  }
};

export const PURPOSE_WEIGHTS = {
  MEDICAL: 50,
  EDUCATION_EXAM: 35,
  WORK_COMMUTE: 20,
  GENERAL_LEISURE: 5
};

/**
 * Computes composite passenger priority score.
 * Minimum qualifying score for reserved front seating (Seats 1 to 6) is 70 (or Medical / Divyang / Senior 60+).
 */
export function calculatePriorityScore({ age = 25, tripPurpose = 'GENERAL_LEISURE', isDivyang = false } = {}) {
  let score = 0;
  const numAge = Number(age) || 25;
  const cleanPurpose = (tripPurpose || 'GENERAL_LEISURE').toUpperCase();

  // 1. Purpose Weight
  const purposeWeight = PURPOSE_WEIGHTS[cleanPurpose] || 5;
  score += purposeWeight;

  // 2. Age & Physical Vulnerability Weight
  // - Divyang / Reduced Mobility adds +50 to baseline
  // - Senior citizens (65+) automatically reach priority threshold (65 + min 5 = 70)
  // - Senior citizens (60-64) receive +40
  // - Children (<=10) receive +25
  // - Adults receive +10
  let ageWeight = 10;
  if (numAge >= 65) {
    ageWeight = 65;
  } else if (numAge >= 60) {
    ageWeight = 40;
  } else if (numAge <= 10) {
    ageWeight = 25;
  }

  if (isDivyang) {
    score += 50 + ageWeight;
  } else {
    score += ageWeight;
  }

  // Qualification for front row reserved seating:
  // Requires score >= 70 OR explicit Medical / Senior 60+ / Divyang emergency
  const isHighPriority = score >= 70 || cleanPurpose === 'MEDICAL' || isDivyang || numAge >= 60;
  const tier = (score >= 70 || isHighPriority) ? 'TIER_1' : score >= 40 ? 'TIER_2' : 'TIER_3';

  return {
    score,
    isHighPriority,
    isEligibleForPrioritySeat: isHighPriority,
    tier,
    purposeWeight,
    ageWeight,
    breakdown: {
      tripPurpose: cleanPurpose,
      purposeWeight,
      age: numAge,
      isDivyang: Boolean(isDivyang),
      finalScore: score
    }
  };
}

/**
 * Identifies if a seat is a front reserved priority seat (Seats 1 to 6)
 */
export const RESERVED_FRONT_SEATS = new Set([
  '1A', '1B', '1C', '1D', '2A', '2B',
  'L1', 'L2', 'L3', 'L4', 'L5', 'L6',
  'S1', 'S2', 'S3', 'S4', 'S5', 'S6',
  '1', '2', '3', '4', '5', '6'
]);

export function isReservedPrioritySeat(seatId) {
  if (!seatId) return false;
  const clean = String(seatId).trim().toUpperCase();
  if (RESERVED_FRONT_SEATS.has(clean)) return true;
  if (/^\d+$/.test(clean)) {
    const num = parseInt(clean, 10);
    return num >= 1 && num <= 6;
  }
  return false;
}
