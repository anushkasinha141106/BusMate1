import { Router } from 'express';
import {
  getDispatchRecommendation,
  recordEvaluation,
  getEvaluations
} from '../controllers/agentController.js';

const router = Router();

// Stage 3 Telemetry Proxy: GET /api/agent/dispatch-recommendation/:routeId
router.get('/dispatch-recommendation/:routeId', getDispatchRecommendation);

// Stage 4 Evaluation Telemetry Endpoints
router.post('/evaluation', recordEvaluation);
router.get('/evaluations', getEvaluations);

export default router;
