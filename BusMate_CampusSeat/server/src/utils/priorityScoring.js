/**
 * server/src/utils/priorityScoring.js
 * Backend scoring engine for revalidating priority eligibility and preventing client-side spoofing.
 */

export const PURPOSE_WEIGHTS = {
  MEDICAL: 50,
  EDUCATION_EXAM: 35,
  WORK_COMMUTE: 20,
  GENERAL_LEISURE: 5
};

export function calculatePriorityScore({ age = 25, tripPurpose = 'GENERAL_LEISURE', isDivyang = false } = {}) {
  let score = 0;
  const numAge = Number(age) || 25;
  const cleanPurpose = (tripPurpose || 'GENERAL_LEISURE').toUpperCase();

  // 1. Purpose Weight
  const purposeWeight = PURPOSE_WEIGHTS[cleanPurpose] || 5;
  score += purposeWeight;

  // 2. Age & Vulnerability Weight
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

  const isHighPriority = score >= 70 || cleanPurpose === 'MEDICAL' || isDivyang || numAge >= 60;
  const tier = (score >= 70 || isHighPriority) ? 'TIER_1' : score >= 40 ? 'TIER_2' : 'TIER_3';

  return {
    score,
    isHighPriority,
    isEligibleForPrioritySeat: isHighPriority,
    tier,
    purposeWeight,
    ageWeight
  };
}

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
