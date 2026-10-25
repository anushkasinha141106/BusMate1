/**
 * SmartBus Production Backend API Server
 * Runtime: Node.js + Express
 * Serves normalized datasets and ML endpoints powered by 4 Kaggle Transit Datasets:
 * 1. EDA: Transits Utilities Demo (Network, Utilities, Operating Hours, Standard Fares)
 * 2. Forecasting Bus Demand with Time Series (ML Regression Demand Forecasts)
 * 3. Bus Passengers (Boarding/Alighting Interchange & Demographic Flow)
 * 4. Smart Traffic Volume Forecasting Challenge (Corridor Congestion & Delay ETA)
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import agentRoutes from './server/src/routes/agentRoutes.js';
import { calculatePriorityScore, isReservedPrioritySeat } from './server/src/utils/priorityScoring.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/api/agent', agentRoutes);

// Load data artifacts from src/data/
const routesPath = path.join(__dirname, 'src', 'data', 'routes.json');
const tripsPath = path.join(__dirname, 'src', 'data', 'trips.json');
const predictionsPath = path.join(__dirname, 'src', 'data', 'predictions.json');
const metricsPath = path.join(__dirname, 'src', 'data', 'model_metrics.json');
const trafficPath = path.join(__dirname, 'src', 'data', 'traffic_delays.json');
const passengersPath = path.join(__dirname, 'src', 'data', 'passenger_flow.json');
const surveyPath = path.join(__dirname, 'src', 'data', 'survey.json');

let routesData = [];
let tripsData = [];
let predictionsData = { forecasts: {} };
let metricsData = {};
let trafficData = [];
let passengersData = [];
let surveyData = {};

try {
  if (fs.existsSync(routesPath)) routesData = JSON.parse(fs.readFileSync(routesPath, 'utf-8'));
  if (fs.existsSync(tripsPath)) tripsData = JSON.parse(fs.readFileSync(tripsPath, 'utf-8'));
  if (fs.existsSync(predictionsPath)) predictionsData = JSON.parse(fs.readFileSync(predictionsPath, 'utf-8'));
  if (fs.existsSync(metricsPath)) metricsData = JSON.parse(fs.readFileSync(metricsPath, 'utf-8'));
  if (fs.existsSync(trafficPath)) trafficData = JSON.parse(fs.readFileSync(trafficPath, 'utf-8'));
  if (fs.existsSync(passengersPath)) passengersData = JSON.parse(fs.readFileSync(passengersPath, 'utf-8'));
  if (fs.existsSync(surveyPath)) surveyData = JSON.parse(fs.readFileSync(surveyPath, 'utf-8'));
  
  console.log(`[SmartBus API] Successfully loaded:`);
  console.log(` - Routes: ${routesData.length}`);
  console.log(` - Trips: ${tripsData.length}`);
  console.log(` - Forecasts: ${Object.keys(predictionsData.forecasts || {}).length}`);
  console.log(` - Traffic Corridors: ${trafficData.length}`);
  console.log(` - Station Interchanges: ${passengersData.length}`);
} catch (err) {
  console.error('[SmartBus API] Error loading dataset artifacts:', err.message);
}

// 1. Health Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'SmartBus Intelligence API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    dataset: {
      source: '4 Kaggle Real-World Transit Datasets (Utilities, Time-Series Demand, Passenger Demographics, Traffic Volume)',
      tripsRecorded: tripsData.length,
      routesActive: routesData.length,
      trafficCorridorsMonitored: trafficData.length,
      modelType: 'Scikit-Learn RandomForest (MAE=2.66 passengers, R2=0.932)',
      busCapacityPerVehicle: 52
    }
  });
});

// 2. Public Transit Routes Directory: GET /api/routes
app.get('/api/routes', (req, res) => {
  res.status(200).json({
    count: routesData.length,
    routes: routesData
  });
});

// 3. Corridor Traffic & Congestion Delays: GET /api/traffic
app.get('/api/traffic', (req, res) => {
  res.status(200).json({
    count: trafficData.length,
    corridors: trafficData
  });
});

// 4. Passenger Interchange & Demographic Flow: GET /api/passengers
app.get('/api/passengers', (req, res) => {
  res.status(200).json({
    count: passengersData.length,
    interchangeStations: passengersData
  });
});

// 5. Trips Endpoint: GET /api/trips?route=&from=&to=
app.get('/api/trips', (req, res) => {
  const { route, from, to } = req.query;

  const validRoutes = [
    'LINE_SWAR_STN', 'LINE_KATR_SHIV', 'LINE_HINJ_STN', 'LINE_HAD_KOTH', 'LINE_VIM_SWAR', 'LINE_PUN_TALE',
    'TALEGAON', 'GODAVARI', 'GODAVARI_VIA_TALEGAON'
  ];

  if (route && !validRoutes.includes(route.toUpperCase())) {
    return res.status(400).json({
      error: 'Bad Request',
      message: `Invalid route '${route}'. Valid options: ${validRoutes.join(', ')}`
    });
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (from && !dateRegex.test(from)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: "Invalid 'from' date format. Expected YYYY-MM-DD."
    });
  }
  if (to && !dateRegex.test(to)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: "Invalid 'to' date format. Expected YYYY-MM-DD."
    });
  }

  let results = [...tripsData];

  if (route) {
    const rUp = route.toUpperCase();
    results = results.filter(t => {
      if (t.route === rUp) return true;
      if (rUp === 'TALEGAON' && t.route.includes('TALE')) return true;
      if (rUp === 'GODAVARI' && t.route.includes('SWAR')) return true;
      return false;
    });
  }
  if (from) {
    results = results.filter(t => t.date >= from);
  }
  if (to) {
    results = results.filter(t => t.date <= to);
  }

  res.status(200).json({
    count: results.length,
    filters: { route: route || 'ALL', from: from || null, to: to || null },
    trips: results
  });
});

// 6. Demand Forecast Endpoint: GET /api/demand?route=&day=&slot=
app.get('/api/demand', (req, res) => {
  const route = req.query.route ? req.query.route.toUpperCase() : 'LINE_HINJ_STN';
  const day = req.query.day || 'Friday';
  const slot = req.query.slot || '18:15';

  const validRoutes = [
    'LINE_SWAR_STN', 'LINE_KATR_SHIV', 'LINE_HINJ_STN', 'LINE_HAD_KOTH', 'LINE_VIM_SWAR', 'LINE_PUN_TALE',
    'TALEGAON', 'GODAVARI', 'GODAVARI_VIA_TALEGAON'
  ];
  if (!validRoutes.includes(route)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: `Invalid route '${route}'. Must be one of: ${validRoutes.join(', ')}`
    });
  }

  const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  if (!validDays.includes(day)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: `Invalid day '${day}'. Must be one of: ${validDays.join(', ')}`
    });
  }

  // Look up in trained forecasts
  const key = `${route}_${day}_${slot}`;
  const forecasts = predictionsData.forecasts || {};
  let forecast = forecasts[key];

  if (!forecast) {
    // Search by route and day
    const candidates = Object.keys(forecasts).filter(k => k.startsWith(`${route}_${day}_`));
    if (candidates.length > 0) {
      forecast = forecasts[candidates[0]];
    } else {
      forecast = Object.values(forecasts)[0];
    }
  }

  res.status(200).json({
    query: { route, dayOfWeek: day, timeSlot: slot },
    prediction: forecast,
    metricsSummary: {
      trainMAE: metricsData.models?.RandomForestRegressor?.train_mae || 2.58,
      testMAE: metricsData.models?.RandomForestRegressor?.test_mae || 2.66,
      residualStd: metricsData.residual_std || 3.17,
      confidenceMargin90pct: metricsData.confidence_margin_90pct || 5.2
    }
  });
});

// 7. Seat Allocation Endpoint: POST /api/allocate
app.post('/api/allocate', (req, res) => {
  const { tripId, passengerCategory, hasConnectingTrain, hasMobilityNeed, requestTime } = req.body;

  if (!tripId) {
    return res.status(400).json({
      error: 'Bad Request',
      message: "Missing required parameter 'tripId'."
    });
  }

  const trip = tripsData.find(t => t.tripId === tripId);
  if (!trip) {
    return res.status(404).json({
      error: 'Not Found',
      message: `Trip with ID '${tripId}' does not exist.`
    });
  }

  // Hard constraints check
  if (trip.recordedBookings >= trip.capacity) {
    return res.status(200).json({
      allocated: false,
      tripId,
      reason: 'Physical capacity limit reached (52 seats full).',
      alternativeOffered: 'Subsequent departure slot recommended.',
      policy: 'SmartBus Constraint-Aware Allocation'
    });
  }

  // Fairness weighting
  let priorityScore = 50;
  if (hasMobilityNeed) priorityScore += 40; // Hard accessibility priority
  if (hasConnectingTrain) priorityScore += 25; // Train deadline constraint
  if (passengerCategory === 'Senior' || passengerCategory === 'Disabled') priorityScore += 20;
  if (passengerCategory === 'Faculty' || passengerCategory === 'Staff') priorityScore += 10;

  res.status(200).json({
    allocated: true,
    tripId,
    assignedSeatNumber: trip.recordedBookings + 1,
    priorityScore,
    route: trip.route,
    departure: trip.departure,
    policy: 'SmartBus Fairness-Aware Dynamic Points System',
    timestamp: new Date().toISOString()
  });
});

// 8. Seat Hold Endpoint: POST /api/bookings/hold
const activeSeatHolds = new Map();

app.post('/api/bookings/hold', (req, res) => {
  const { busId, seats, boarding, dropping, totalBaseFare, tripPurpose, age, isDivyang, passengers } = req.body;

  if (!busId || !seats || !Array.isArray(seats) || seats.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: 'Missing required parameters. At least 1 seat and busId are required.'
    });
  }

  // Anti-spoofing check for priority seats
  const hasPrioritySeat = seats.some(s => isReservedPrioritySeat(s));
  const primaryAge = age || passengers?.[0]?.age || 25;
  const primaryPurpose = tripPurpose || passengers?.[0]?.tripPurpose || 'GENERAL_LEISURE';
  const primaryDivyang = isDivyang ?? passengers?.[0]?.isDivyang ?? false;

  const priorityResult = calculatePriorityScore({
    age: primaryAge,
    tripPurpose: primaryPurpose,
    isDivyang: primaryDivyang
  });

  if (hasPrioritySeat && !priorityResult.isHighPriority && priorityResult.score < 70) {
    return res.status(422).json({
      success: false,
      error: 'PrioritySeatingEligibilityError',
      message: `Selected seat is reserved for passengers traveling for medical needs, senior citizens (60+), or persons with reduced mobility. Your calculated priority score is ${priorityResult.score} (requires 70+). Please select a general seat or update your travel purpose.`,
      score: priorityResult.score,
      requiredScore: 70
    });
  }

  const holdId = `HOLD_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const holdRecord = {
    holdId,
    busId,
    seats,
    boarding: boarding || null,
    dropping: dropping || null,
    tripPurpose: primaryPurpose,
    priorityScore: priorityResult.score,
    totalBaseFare: totalBaseFare || 0,
    createdAt: new Date().toISOString(),
    expiresInSeconds: 600,
    expiresAt: new Date(Date.now() + 600 * 1000).toISOString()
  };

  activeSeatHolds.set(holdId, holdRecord);

  res.status(200).json({
    success: true,
    message: 'Seats held successfully for 10 minutes.',
    holdId,
    expiresIn: 600,
    holdRecord
  });
});

// 9. Booking Confirmation Endpoint: POST /api/bookings/confirm
app.post('/api/bookings/confirm', (req, res) => {
  const { holdId, busId, seats, passengers, tripPurpose, age, isDivyang, contactEmail, contactPhone, idempotencyToken, paymentMethod, fareBreakdown } = req.body;

  const seatsToBook = seats || [];
  const hasPrioritySeat = seatsToBook.some(s => isReservedPrioritySeat(s));
  const primaryAge = age || passengers?.[0]?.age || 25;
  const primaryPurpose = tripPurpose || passengers?.[0]?.tripPurpose || 'GENERAL_LEISURE';
  const primaryDivyang = isDivyang ?? passengers?.[0]?.isDivyang ?? false;

  const priorityResult = calculatePriorityScore({
    age: primaryAge,
    tripPurpose: primaryPurpose,
    isDivyang: primaryDivyang
  });

  if (hasPrioritySeat && !priorityResult.isHighPriority && priorityResult.score < 70) {
    return res.status(422).json({
      success: false,
      error: 'PrioritySeatingEligibilityError',
      message: `Selected seat is reserved for passengers traveling for medical needs, senior citizens (60+), or persons with reduced mobility. Your calculated priority score is ${priorityResult.score} (requires 70+). Please select a general seat or update your travel purpose.`,
      score: priorityResult.score,
      requiredScore: 70
    });
  }

  const pnrNumber = 'PNR-' + Math.floor(Math.random() * 899999 + 100000);
  const confirmedBooking = {
    pnr: pnrNumber,
    holdId: holdId || null,
    busId: busId || 'SB-01',
    seats: seatsToBook,
    passengers: passengers || [],
    tripPurpose: primaryPurpose,
    priorityScore: priorityResult.score,
    isPrioritySeat: hasPrioritySeat,
    contactEmail: contactEmail || 'commuter@smartbus.gov.in',
    contactPhone: contactPhone || '+91 98765 43210',
    fareBreakdown: fareBreakdown || { total: 50 },
    idempotencyToken: idempotencyToken || `idemp_${Date.now()}`,
    paymentMethod: paymentMethod || 'UPI',
    status: 'Confirmed',
    bookingDate: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
    confirmedAt: new Date().toISOString()
  };

  if (holdId && activeSeatHolds.has(holdId)) {
    activeSeatHolds.delete(holdId);
  }

  res.status(200).json({
    success: true,
    message: 'Ticket confirmed and booked successfully.',
    pnr: pnrNumber,
    booking: confirmedBooking
  });
});

// Evaluation telemetry endpoints
const userEvaluationsFilePath = path.join(__dirname, 'src/data/user_evaluations.json');
let userEvalsCache = [];
try {
  if (fs.existsSync(userEvaluationsFilePath)) {
    userEvalsCache = JSON.parse(fs.readFileSync(userEvaluationsFilePath, 'utf-8'));
  }
} catch (e) {
  console.warn('Could not read user_evaluations.json in server.js:', e);
}

app.post('/api/evaluations', (req, res) => {
  const newRecord = {
    id: `peval_${Date.now()}_${Math.floor(Math.random() * 900 + 100)}`,
    userId: req.body.userId || `usr_${Math.floor(Math.random() * 9000 + 1000)}`,
    group: (req.body.group || 'B').toUpperCase(),
    status: (req.body.status || 'CONFIRMED').toUpperCase(),
    tripPurpose: req.body.tripPurpose || 'GENERAL_LEISURE',
    seatNumber: req.body.seatNumber || null,
    understandingScore: Number(req.body.understandingScore) || 3,
    understandingText: req.body.understandingText || 'Very Clear',
    fairnessScore: Number(req.body.fairnessScore) || 5,
    isFair: Boolean(req.body.isFair !== false && Number(req.body.fairnessScore) >= 3),
    acceptedReallocation: req.body.acceptedReallocation !== undefined ? Boolean(req.body.acceptedReallocation) : null,
    timestamp: req.body.timestamp || new Date().toISOString()
  };
  userEvalsCache.unshift(newRecord);
  try {
    fs.writeFileSync(userEvaluationsFilePath, JSON.stringify(userEvalsCache, null, 2), 'utf-8');
  } catch (err) {}
  res.status(201).json({ success: true, evaluation: newRecord });
});

app.get('/api/evaluations', (req, res) => {
  const groupA = userEvalsCache.filter(r => r.group === 'A');
  const groupB = userEvalsCache.filter(r => r.group === 'B');
  const calcFairnessRate = (arr) => arr.length ? Math.round((arr.filter(r => r.isFair || r.fairnessScore >= 4).length / arr.length) * 1000) / 10 : 0;
  const calcAcceptanceRate = (arr) => {
    const realloc = arr.filter(r => r.status === 'REALLOCATED');
    return realloc.length ? Math.round((realloc.filter(r => r.acceptedReallocation === true).length / realloc.length) * 1000) / 10 : 100;
  };
  res.json({
    success: true,
    metrics: {
      total_evaluations: userEvalsCache.length,
      group_A_count: groupA.length,
      group_B_count: groupB.length,
      group_A_fairness_rate_pct: calcFairnessRate(groupA),
      group_B_fairness_rate_pct: calcFairnessRate(groupB),
      group_A_acceptance_rate_pct: calcAcceptanceRate(groupA),
      group_B_acceptance_rate_pct: calcAcceptanceRate(groupB)
    },
    evaluations: userEvalsCache
  });
});

// 404 handler for invalid routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.originalUrl,
    message: `Resource '${req.originalUrl}' not found on SmartBus API.`
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`[SmartBus API v2] Running at http://localhost:${PORT}`);
  console.log(`[SmartBus API v2] Health check available at http://localhost:${PORT}/api/health`);
});
