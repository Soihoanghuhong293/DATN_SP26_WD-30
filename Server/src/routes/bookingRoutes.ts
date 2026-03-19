import express from 'express';
import * as bookingController from '../controllers/bookingController';
import { protect, restrictToAdmin, restrictToGuide } from '../middlewares/auth.middleware';

const router = express.Router();

router.get('/me', protect, bookingController.getMyBookingsForUser);
router.get('/me/:id', protect, bookingController.getMyBookingDetailForUser);

// Phải đặt trước /:id để "guide" không bị hiểu là id
router.get('/guide/me', protect, restrictToGuide, bookingController.getMyBookings);
router.get('/guide/:id', protect, restrictToGuide, bookingController.getMyBookingDetail);
router.patch('/guide/:id/checkin', protect, restrictToGuide, bookingController.checkInPassenger);
router.patch('/guide/:id/stage', protect, restrictToGuide, bookingController.updateTourStage);
router.patch('/guide/:id/diary', protect, restrictToGuide, bookingController.addDiaryEntryForGuide);

router
  .route('/')
  .get(protect, restrictToAdmin, bookingController.getAllBookings) 
  .post(bookingController.createBooking); 

router
  .route('/:id')
  .get(protect, restrictToAdmin, bookingController.getBooking)
  .put(protect, restrictToAdmin, bookingController.updateBooking) // <-- Đã đổi updateBookingStatus thành updateBooking
  .delete(protect, restrictToAdmin, bookingController.deleteBooking);

export default router;