import express from 'express';
import * as bookingController from '../controllers/bookingController';
import { protect, restrictToGuide } from '../middlewares/auth.middleware';

const router = express.Router();

// Phải đặt trước /:id để "guide" không bị hiểu là id
router.get('/guide/me', protect, restrictToGuide, bookingController.getMyBookings);
router.get('/guide/:id', protect, restrictToGuide, bookingController.getMyBookingDetail);
router.patch('/guide/:id/checkin', protect, restrictToGuide, bookingController.checkInPassenger);

router
  .route('/')
  .get(bookingController.getAllBookings) 
  .post(bookingController.createBooking); 

router
  .route('/:id')
  .get(bookingController.getBooking)
  .put(bookingController.updateBookingStatus) 
  .delete(bookingController.deleteBooking);

export default router;