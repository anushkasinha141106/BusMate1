import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const userEvaluationsPath = path.resolve(__dirname, '../../../src/data/user_evaluations.json');

// In-memory cache synced with disk
let userEvaluationsCache = [];
try {
  if (fs.existsSync(userEvaluationsPath)) {
    userEvaluationsCache = JSON.parse(fs.readFileSync(userEvaluationsPath, 'utf-8'));
  }
} catch (e) {
  console.warn('[EvaluationController] Could not load user_evaluations.json:', e.message);
}

/**
 * Helper to compute A/B fairness, acceptance, and schedule flexibility metrics
 */
const calculateMetrics = (records) => {
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

  // 1. Flexibility Adoption Rate: % of passengers opting into flexible travel
  const flexibleRecords = records.filter(r => r.isFlexible === true);
  const flexibility_adoption_rate_pct = records.length > 0 
    ? Math.round((flexibleRecords.length / records.length) * 1000) / 10 
    : 0;

  // 2. Average Acceptable Window & Distribution (15m vs 30m vs 60m)
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

  // 3. Reallocation Acceptance Rate: % of flexible passengers happy with reassigned shuttle vs reverting
  const flexibleReallocated = records.filter(r => (r.status === 'REALLOCATED' || r.wasReallocated === true) && r.isFlexible === true);
  const flexibleAccepted = flexibleReallocated.filter(r => r.acceptedReallocation === true);
  const flexible_reallocation_acceptance_rate_pct = flexibleReallocated.length > 0
    ? Math.round((flexibleAccepted.length / flexibleReallocated.length) * 1000) / 10
    : 92.5;

  return {
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
    // Schedule Flexibility Telemetry
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
  };
};

/**
 * POST /api/evaluations
 * Record a user's feedback on allocation transparency, schedule flexibility, and fairness
 */
export const recordUserEvaluation = (req, res) => {
  const {
    userId,
    group = 'B',
    status = 'CONFIRMED',
    tripPurpose = 'GENERAL_LEISURE',
    seatNumber = null,
    understandingScore = 3,
    understandingText = 'Very Clear',
    fairnessScore = 5,
    isFair = true,
    acceptedReallocation = null,
    // Schedule Flexibility preference & reallocation telemetry
    isFlexible = false,
    windowMinutes = 0,
    flexibilityDirection = 'ANY',
    wasReallocated = false,
    originalBusTime = '17:30',
    assignedBusTime = '17:30',
    satisfactionRating = 5,
    timestamp
  } = req.body;

  const newRecord = {
    id: `peval_${Date.now()}_${Math.floor(Math.random() * 900 + 100)}`,
    userId: userId || `usr_${Math.floor(Math.random() * 9000 + 1000)}`,
    group: (group || 'B').toUpperCase(),
    status: status.toUpperCase(),
    tripPurpose,
    seatNumber,
    understandingScore: Number(understandingScore) || 3,
    understandingText: understandingText || (Number(understandingScore) === 3 ? 'Very Clear' : Number(understandingScore) === 2 ? 'Somewhat Clear' : 'Confusing / Unfair'),
    fairnessScore: Number(fairnessScore) || 5,
    isFair: Boolean(isFair !== false && Number(fairnessScore) >= 3),
    acceptedReallocation: acceptedReallocation !== undefined ? Boolean(acceptedReallocation) : null,
    // Flexibility fields
    isFlexible: Boolean(isFlexible),
    windowMinutes: Number(windowMinutes) || 0,
    flexibilityDirection: flexibilityDirection || 'ANY',
    wasReallocated: Boolean(wasReallocated),
    originalBusTime: originalBusTime || '17:30',
    assignedBusTime: assignedBusTime || '17:30',
    satisfactionRating: Number(satisfactionRating) || Number(fairnessScore) || 5,
    timestamp: timestamp || new Date().toISOString()
  };

  userEvaluationsCache.unshift(newRecord);

  // Asynchronously persist to file
  try {
    fs.writeFileSync(userEvaluationsPath, JSON.stringify(userEvaluationsCache, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[EvaluationController] Could not write user evaluations to disk:', e.message);
  }

  const metrics = calculateMetrics(userEvaluationsCache);

  return res.status(201).json({
    success: true,
    message: 'User allocation evaluation telemetry recorded successfully.',
    evaluation: newRecord,
    metrics
  });
};

/**
 * GET /api/evaluations
 * Return current A/B testing metrics and evaluation history
 */
export const getUserEvaluations = (req, res) => {
  const metrics = calculateMetrics(userEvaluationsCache);

  return res.status(200).json({
    success: true,
    metrics,
    evaluations: userEvaluationsCache
  });
};

