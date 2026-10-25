import { Router } from 'express';
import { getRoutes, searchBuses, getBusSeats } from '../controllers/busController.js';

const router = Router();

router.get('/', searchBuses);
router.get('/routes', getRoutes);
router.get('/search', searchBuses);
router.get('/:id/seats', getBusSeats);

export default router;
