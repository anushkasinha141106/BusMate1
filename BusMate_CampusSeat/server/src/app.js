import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import busRoutes from './routes/busRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import transitRoutes from './routes/transitRoutes.js';
import agentRoutes from './routes/agentRoutes.js';
import evaluationRoutes from './routes/evaluationRoutes.js';
import { getRoutes, searchBuses } from './controllers/busController.js';
import {
  getHealth,
  getTraffic,
  getPassengers,
  getDemandForecast,
  allocateSeat
} from './controllers/transitController.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Endpoint
app.get('/api/health', getHealth);

// Modular API Routers
app.use('/api/auth', authRoutes);
app.use('/api/buses', busRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/transit', transitRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/evaluations', evaluationRoutes);

// Legacy Root API endpoints for backwards compatibility with tests and services
app.get('/api/routes', getRoutes);
app.get('/api/trips', searchBuses);
app.get('/api/traffic', getTraffic);
app.get('/api/passengers', getPassengers);
app.get('/api/demand', getDemandForecast);
app.post('/api/allocate', allocateSeat);

// Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
