import { Router } from 'express';
import {
  holdSeats,
  confirmBooking,
  getMyBookings,
  getBookingByPNR
} from '../controllers/bookingController.js';
import { optionalAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/hold', optionalAuth, holdSeats);
router.post('/confirm', optionalAuth, confirmBooking);
router.get('/my-trips', optionalAuth, getMyBookings);
router.get('/pnr/:pnr', getBookingByPNR);

export default router;
