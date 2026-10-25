// SmartBus Intelligent Fleet Recommendation Service
// Derived from 4 Kaggle Transit Datasets:
// - Dataset 1: Transit Network & Service Headways
// - Dataset 2: Bus Passenger Demand Time Series
// - Dataset 3: Station Boarding/Alighting Interchange
// - Dataset 4: Smart Traffic Volume & Corridor Delays

const INITIAL_RECOMMENDATIONS = [
  {
    id: 'REC-101',
    title: 'Deploy Standby Electric Bus on Hinjawadi IT Express (SB-03)',
    routeNumber: '310 IT Express',
    busId: 'SB-03',
    timeSlot: '18:15',
    predictedDemand: 68,
    overcrowdingRisk: '86% (High)',
    existingCapacity: 52,
    requiredCapacity: 70,
    recommendedAction: 'Deploy 1 standby low-floor electric bus during 18:15 peak shift to absorb Wakad/Aundh IT corridor surge.',
    expectedWaitReduction: '74% reduction in commuter wait times at Hinjawadi Phase 1 & 3 stops.',
    status: 'Pending',
    priority: 'High'
  },
  {
    id: 'REC-102',
    title: 'Boost Frequency on Swargate - Station BRTS Corridor (SB-01)',
    routeNumber: '101 BRTS Direct',
    busId: 'SB-01',
    timeSlot: '08:45',
    predictedDemand: 58,
    overcrowdingRisk: '78% (High)',
    existingCapacity: 52,
    requiredCapacity: 64,
    recommendedAction: 'Reduce Shivaji Road headway from 12 mins to 8 mins to clear interchange backlog at Sarasbaug & PMC Bhavan.',
    expectedWaitReduction: 'Prevents platform crowding and cuts average dwell time by 3.2 mins.',
    status: 'Pending',
    priority: 'High'
  },
  {
    id: 'REC-103',
    title: 'Traffic Congestion Relief: Reallocate Vehicle from Route 412 to 204',
    routeNumber: '412 Cross-Town → 204 Express',
    busId: 'SB-04',
    timeSlot: '17:30',
    predictedDemand: 34,
    overcrowdingRisk: '38% (Low)',
    existingCapacity: 52,
    requiredCapacity: 40,
    recommendedAction: 'Transfer 1 idle bus from Kothrud off-peak run to Katraj-Satara Road trunk to counter traffic delay (+14 mins).',
    expectedWaitReduction: 'Maintains 10-minute scheduled headway despite Satara Road highway slowdown.',
    status: 'Pending',
    priority: 'Medium'
  },
  {
    id: 'REC-104',
    title: 'EMU Railway Transfer Coordination: Talegaon Suburban Link (SB-06)',
    routeNumber: '601 Suburban Link',
    busId: 'SB-06',
    timeSlot: '19:40',
    predictedDemand: 62,
    overcrowdingRisk: '79% (High)',
    existingCapacity: 52,
    requiredCapacity: 68,
    recommendedAction: 'Hold departure by 5 mins to synchronize with arriving Pune-Lonavala EMU local train interchange at Talegaon.',
    expectedWaitReduction: 'Protects 24 suburban train-to-bus transfer passengers from missing evening connection.',
    status: 'Pending',
    priority: 'Medium'
  }
];

export const getFleetRecommendations = () => {
  const saved = localStorage.getItem('smartbus_fleet_recommendations');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading recommendations from localStorage:', e);
    }
  }
  localStorage.setItem('smartbus_fleet_recommendations', JSON.stringify(INITIAL_RECOMMENDATIONS));
  return INITIAL_RECOMMENDATIONS;
};

export const updateRecommendationStatus = (id, newStatus) => {
  const current = getFleetRecommendations();
  const updated = current.map(rec => rec.id === id ? { ...rec, status: newStatus } : rec);
  localStorage.setItem('smartbus_fleet_recommendations', JSON.stringify(updated));
  return updated;
};

export const resetRecommendations = () => {
  localStorage.setItem('smartbus_fleet_recommendations', JSON.stringify(INITIAL_RECOMMENDATIONS));
  return INITIAL_RECOMMENDATIONS;
};
