import { Router } from 'express';
import {
  getHealth,
  getTraffic,
  getPassengers,
  getDemandForecast,
  allocateSeat
} from '../controllers/transitController.js';

const router = Router();

router.get('/health', getHealth);
router.get('/traffic', getTraffic);
router.get('/passengers', getPassengers);
router.get('/demand', getDemandForecast);
router.post('/allocate', allocateSeat);

export default router;
