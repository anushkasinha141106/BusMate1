import { Router } from 'express';
import {
  recordUserEvaluation,
  getUserEvaluations
} from '../controllers/evaluationController.js';

const router = Router();

// Passenger Allocation A/B Evaluation Telemetry Routes
router.post('/', recordUserEvaluation);
router.get('/', getUserEvaluations);

export default router;
