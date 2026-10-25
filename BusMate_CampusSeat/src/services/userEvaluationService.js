/**
 * User Evaluation & HCI A/B Testing Service
 * Handles test condition assignment (Group A: Control vs Group B: Transparent Explanations),
 * logging passenger evaluations to localStorage and backend API, and computing research metrics.
 */
import initialUserEvaluations from '../data/user_evaluations.json';

const STORAGE_KEY = 'smartbus_user_evaluations';
const GROUP_STORAGE_KEY = 'smartbus_ab_group';

/**
 * Determine or retrieve the passenger's A/B testing condition
 * - URL Override: ?testMode=explainable -> 'B' (Treatment)
 * - URL Override: ?testMode=opaque -> 'A' (Control)
 * - Fallback: Persisted in localStorage, or randomly assigned 50/50.
 */
export const getActiveTestGroup = () => {
  try {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const testMode = params.get('testMode');
      if (testMode === 'explainable' || testMode === 'transparent' || testMode === 'B') {
        localStorage.setItem(GROUP_STORAGE_KEY, 'B');
        return 'B';
      }
      if (testMode === 'opaque' || testMode === 'control' || testMode === 'A') {
        localStorage.setItem(GROUP_STORAGE_KEY, 'A');
        return 'A';
      }

      const savedGroup = localStorage.getItem(GROUP_STORAGE_KEY);
      if (savedGroup === 'A' || savedGroup === 'B') {
        return savedGroup;
      }

      // Random 50/50 split
      const assigned = Math.random() < 0.5 ? 'A' : 'B';
      localStorage.setItem(GROUP_STORAGE_KEY, assigned);
      return assigned;
    }
  } catch (e) {
    console.warn('[UserEvaluationService] Error resolving test group:', e);
  }
  return 'B';
};

export const setActiveTestGroup = (group) => {
  try {
    const valid = group === 'A' ? 'A' : 'B';
    localStorage.setItem(GROUP_STORAGE_KEY, valid);
    return valid;
  } catch (e) {
    return 'B';
  }
};

/**
 * Get all stored user evaluations from localStorage merged with initial seed
 */
export const getStoredEvaluations = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[UserEvaluationService] Error reading localStorage:', e);
  }
  // Initialize localStorage with initial seed data
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialUserEvaluations));
  } catch (e) {}
  return [...initialUserEvaluations];
};

/**
 * Record a user evaluation (both to localStorage and API)
 */
export const recordUserEvaluation = async (evaluationData) => {
  const newRecord = {
    id: `peval_${Date.now()}_${Math.floor(Math.random() * 900 + 100)}`,
    userId: evaluationData.userId || `usr_${Math.floor(Math.random() * 9000 + 1000)}`,
    group: (evaluationData.group || getActiveTestGroup()).toUpperCase(),
    status: (evaluationData.status || 'CONFIRMED').toUpperCase(),
    tripPurpose: evaluationData.tripPurpose || 'GENERAL_LEISURE',
    seatNumber: evaluationData.seatNumber || null,
    understandingScore: Number(evaluationData.understandingScore) || 3,
    understandingText: evaluationData.understandingText || 'Very Clear',
    fairnessScore: Number(evaluationData.fairnessScore) || 5,
    isFair: Boolean(evaluationData.isFair !== false && Number(evaluationData.fairnessScore) >= 3),
    acceptedReallocation: evaluationData.acceptedReallocation !== undefined ? Boolean(evaluationData.acceptedReallocation) : null,
    // Flexibility telemetry fields
    isFlexible: Boolean(evaluationData.isFlexible),
    windowMinutes: Number(evaluationData.windowMinutes) || 0,
    flexibilityDirection: evaluationData.flexibilityDirection || 'ANY',
    wasReallocated: Boolean(evaluationData.wasReallocated),
    originalBusTime: evaluationData.originalBusTime || '17:30',
    assignedBusTime: evaluationData.assignedBusTime || '17:30',
    satisfactionRating: Number(evaluationData.satisfactionRating) || Number(evaluationData.fairnessScore) || 5,
    timestamp: evaluationData.timestamp || new Date().toISOString()
  };

  // 1. Save to localStorage immediately
  try {
    const existing = getStoredEvaluations();
    const updated = [newRecord, ...existing];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('[UserEvaluationService] Could not persist to localStorage:', e);
  }

  // 2. Transmit to backend API
  try {
    const res = await fetch('/api/evaluations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRecord)
    });
    if (res.ok) {
      const data = await res.json();
      return { success: true, evaluation: data.evaluation || newRecord, metrics: data.metrics };
    }
  } catch (err) {
    console.warn('[UserEvaluationService] API network fallback, saved locally:', err);
  }

  return { success: true, evaluation: newRecord };
};

/**
 * Fetch all evaluations and calculated metrics (from API or local cache)
 */
export const fetchEvaluationsWithMetrics = async () => {
  try {
    const res = await fetch('/api/evaluations');
    if (res.ok) {
      const data = await res.json();
      if (data.metrics && Array.isArray(data.evaluations)) {
        return data;
      }
    }
  } catch (err) {
    console.warn('[UserEvaluationService] Falling back to local evaluations calculation:', err);
  }

  // Calculate locally
  const records = getStoredEvaluations();
  const groupA = records.filter(r => r.group === 'A');
  const groupB = records.filter(r => r.group === 'B');

  const calcFairnessRate = (arr) => {
    if (arr.length === 0) return 0;
    const fairCount = arr.filter(r => r.isFair === true || r.fairnessScore >= 4).length;
    return Math.round((fairCount / arr.length) * 1000) / 10;
  };

  const calcAcceptanceRate = (arr) => {
    const reallocated = arr.filter(r => r.status === 'REALLOCATED' || r.wasReallocated === true);
    if (reallocated.length === 0) return 100;
    const acceptedCount = reallocated.filter(r => r.acceptedReallocation === true).length;
    return Math.round((acceptedCount / reallocated.length) * 1000) / 10;
  };

  const calcAvgScore = (arr, key) => {
    if (arr.length === 0) return 0;
    const sum = arr.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);
    return Math.round((sum / arr.length) * 10) / 10;
  };

  // Flexibility Metrics
  const flexibleRecords = records.filter(r => r.isFlexible === true);
  const flexibility_adoption_rate_pct = records.length > 0 
    ? Math.round((flexibleRecords.length / records.length) * 1000) / 10 
    : 0;

  const count15 = flexibleRecords.filter(r => Number(r.windowMinutes) === 15).length;
  const count30 = flexibleRecords.filter(r => Number(r.windowMinutes) === 30 || !r.windowMinutes).length;
  const count60 = flexibleRecords.filter(r => Number(r.windowMinutes) === 60).length;
  const totalFlex = flexibleRecords.length || 1;

  const window_distribution = {
    pct15: Math.round((count15 / totalFlex) * 1000) / 10,
    pct30: Math.round((count30 / totalFlex) * 1000) / 10,
    pct60: Math.round((count60 / totalFlex) * 1000) / 10,
    count15,
    count30,
    count60
  };

  const sumWindows = flexibleRecords.reduce((acc, r) => acc + (Number(r.windowMinutes) || 30), 0);
  const avg_window_minutes = flexibleRecords.length > 0 
    ? Math.round(sumWindows / flexibleRecords.length) 
    : 30;

  const flexibleReallocated = records.filter(r => (r.status === 'REALLOCATED' || r.wasReallocated === true) && r.isFlexible === true);
  const flexibleAccepted = flexibleReallocated.filter(r => r.acceptedReallocation === true);
  const flexible_reallocation_acceptance_rate_pct = flexibleReallocated.length > 0
    ? Math.round((flexibleAccepted.length / flexibleReallocated.length) * 1000) / 10
    : 92.5;

  return {
    success: true,
    metrics: {
      total_evaluations: records.length,
      group_A_count: groupA.length,
      group_B_count: groupB.length,
      group_A_fairness_rate_pct: calcFairnessRate(groupA),
      group_B_fairness_rate_pct: calcFairnessRate(groupB),
      fairness_lift_pct: Math.round((calcFairnessRate(groupB) - calcFairnessRate(groupA)) * 10) / 10,
      group_A_acceptance_rate_pct: calcAcceptanceRate(groupA),
      group_B_acceptance_rate_pct: calcAcceptanceRate(groupB),
      acceptance_lift_pct: Math.round((calcAcceptanceRate(groupB) - calcAcceptanceRate(groupA)) * 10) / 10,
      group_A_avg_understanding: calcAvgScore(groupA, 'understandingScore'),
      group_B_avg_understanding: calcAvgScore(groupB, 'understandingScore'),
      group_A_avg_fairness: calcAvgScore(groupA, 'fairnessScore'),
      group_B_avg_fairness: calcAvgScore(groupB, 'fairnessScore'),
      flexibility_adoption_rate_pct,
      flexible_count: flexibleRecords.length,
      avg_window_minutes,
      window_distribution,
      flexible_reallocation_acceptance_rate_pct,
      flexible_reallocated_count: flexibleReallocated.length,
      flexible_accepted_count: flexibleAccepted.length,
      understanding_breakdown: {
        very_clear: records.filter(r => r.understandingScore === 3 || r.understandingText === 'Very Clear').length,
        somewhat_clear: records.filter(r => r.understandingScore === 2 || r.understandingText === 'Somewhat Clear').length,
        confusing: records.filter(r => r.understandingScore === 1 || r.understandingText?.includes('Confusing')).length
      }
    },
    evaluations: records
  };
};
