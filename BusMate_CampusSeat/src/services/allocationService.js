// SmartBus Capacity-Constrained Fair Allocation Service
// Implements priority-weighted linear scoring under hard transportation constraints.
// Ensures zero demographic bias, hard capacity limits, priority fulfillment, and transparent explanations.

import { createPRNG } from './seedRandom';

export const DEFAULT_WEIGHTS = {
  w1_constraint: 0.35,  // Constraint level (e.g. mobility need, urgent medical/class appointment)
  w2_disruption: 0.25,  // Expected schedule disruption if denied (hours delayed / missed connection)
  w3_denials: 0.25,     // Number of previous denials on this route
  w4_preference: 0.15,  // Preferred trip time match tightness
};

// Generates synthetic passenger requests for simulation
export const generateSyntheticRequests = (count = 73, seed = 42) => {
  const prng = createPRNG(seed);
  const requests = [];

  const constraintLevels = [
    { level: 3, label: 'High (Accessibility / Medical Need)', probability: 0.2 },
    { level: 2, label: 'Medium (Fixed Work / Class Schedule)', probability: 0.4 },
    { level: 1, label: 'Low (Flexible Leisure Trip)', probability: 0.4 },
  ];

  for (let i = 1; i <= count; i++) {
    const pVal = prng.next();
    let constraint = 1;
    if (pVal < 0.2) constraint = 3;
    else if (pVal < 0.6) constraint = 2;

    const previousDenials = prng.nextInt(0, 3);
    const scheduleDisruption = prng.nextInt(1, 5); // 1-5 scale of impact
    const preferenceMatch = prng.nextInt(2, 5);    // 2-5 scale of time alignment
    const isAccessibilityRequired = constraint === 3 || prng.next() < 0.12;

    requests.push({
      passengerId: `Pass-${String(i).padStart(3, '0')}`,
      constraintLevel: constraint,
      scheduleDisruption: scheduleDisruption,
      previousDenials: previousDenials,
      preferenceMatch: preferenceMatch,
      isAccessibilityRequired: isAccessibilityRequired,
      requestTime: `16:${String(prng.nextInt(10, 59)).padStart(2, '0')}`,
      preferredTrip: 'SB-04 (05:00 PM)',
      alternativeTrip: 'SB-05 (05:20 PM)'
    });
  }

  return requests;
};

export const runFairAllocation = (requests = [], capacity = 50, weights = DEFAULT_WEIGHTS) => {
  const { w1_constraint, w2_disruption, w3_denials, w4_preference } = weights;

  // 1. Calculate Priority Scores for each passenger
  const scoredPassengers = requests.map(req => {
    // Score formula normalized to 0 - 100
    const rawScore = 
      w1_constraint * (req.constraintLevel / 3) +
      w2_disruption * (req.scheduleDisruption / 5) +
      w3_denials * (req.previousDenials / 3) +
      w4_preference * (req.preferenceMatch / 5);
    
    const score = Math.round(rawScore * 100);

    return {
      ...req,
      allocationScore: score
    };
  });

  // 2. Hard Priority Sorting
  // Mandatory accessibility requirements get top priority override under transportation accessibility law
  scoredPassengers.sort((a, b) => {
    if (a.isAccessibilityRequired && !b.isAccessibilityRequired) return -1;
    if (!a.isAccessibilityRequired && b.isAccessibilityRequired) return 1;
    return b.allocationScore - a.allocationScore;
  });

  // 3. Allocate up to Capacity (Hard Constraint)
  let allocatedCount = 0;
  const results = scoredPassengers.map((pass, index) => {
    const isAllocated = index < capacity;
    if (isAllocated) allocatedCount++;

    const seatNumber = isAllocated ? `Seat-${String(index + 1).padStart(2, '0')}` : null;

    // Formulate transparent personalized explanation
    const factors = [];
    if (pass.isAccessibilityRequired) {
      factors.push('Legitimate priority / accessibility requirement satisfied.');
    }
    if (pass.constraintLevel === 3) {
      factors.push('High schedule constraint score.');
    }
    if (pass.previousDenials > 0) {
      factors.push(`You had ${pass.previousDenials} previous denied requests.`);
    }
    if (pass.scheduleDisruption >= 4) {
      factors.push('High expected disruption if waitlisted.');
    }
    if (pass.preferenceMatch >= 4) {
      factors.push('Exact match for preferred departure time.');
    }

    let explanationText = '';
    if (isAllocated) {
      explanationText = `Allocated because: ${factors.join(' ')}`;
    } else {
      explanationText = `Waitlisted because: Trip capacity limit of ${capacity} seats was reached by higher-constraint requests. Recommended alternative trip departs at 5:20 PM.`;
    }

    return {
      ...pass,
      status: isAllocated ? 'Allocated' : 'Waitlisted',
      assignedSeat: seatNumber,
      explanationText,
      keyFactors: factors
    };
  });

  return {
    totalRequests: requests.length,
    capacity,
    allocatedCount,
    waitlistedCount: requests.length - allocatedCount,
    occupancyRate: Math.round((allocatedCount / capacity) * 100),
    results
  };
};
