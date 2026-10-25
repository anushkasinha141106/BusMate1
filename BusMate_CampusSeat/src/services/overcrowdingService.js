// SmartBus Overcrowding Probability Prediction Service
// Evaluates the likelihood of severe overcrowding using multi-factor ML classification logic.
// Note: This model is distinct from demand volume prediction and incorporates delay history, events, and occupancy trends.

export const predictOvercrowdingProbability = (inputs = {}) => {
  const {
    demandRatio = 1.26, // predictedDemand / capacity
    delayMinutes = 5,
    campusEventActive = true,
    previousTripOccupancy = 90, // %
    weatherSeverity = 'Mild', // 'Mild', 'Severe Rain', etc.
    dayOfWeek = 'Friday',
    routeType = 'Campus Express'
  } = inputs;

  let baseProbability = 50;

  // Demand ratio influence
  baseProbability += (demandRatio - 1.0) * 45;

  // Previous trip occupancy carryover factor
  if (previousTripOccupancy > 85) baseProbability += 12;
  else if (previousTripOccupancy < 50) baseProbability -= 10;

  // Campus event congestion
  if (campusEventActive) baseProbability += 15;

  // Delays cause passenger backlog at stops
  if (delayMinutes >= 5) baseProbability += 10;
  if (delayMinutes >= 10) baseProbability += 8;

  // Day factor
  if (dayOfWeek === 'Friday') baseProbability += 8;

  // Clamp probability between 5% and 98%
  const finalProbability = Math.min(98, Math.max(5, Math.round(baseProbability)));

  let riskLevel = 'Low';
  if (finalProbability >= 70) riskLevel = 'High';
  else if (finalProbability >= 45) riskLevel = 'Medium';

  return {
    overcrowdingProbability: finalProbability,
    riskLevel,
    factors: [
      { name: 'Demand-to-Capacity Ratio', impact: `${Math.round(demandRatio * 100)}% ratio (+${Math.round((demandRatio - 1) * 45)}%)` },
      { name: 'Previous Trip Occupancy', impact: `${previousTripOccupancy}% occupancy` },
      { name: 'Campus Event Active', impact: campusEventActive ? '+15% impact' : '0%' },
      { name: 'Route Delay History', impact: `${delayMinutes} mins delay` },
    ],
    simulationTag: 'Simulated ML model output for overcrowding risk.'
  };
};
