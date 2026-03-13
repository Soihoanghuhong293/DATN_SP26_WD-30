import express from 'express';
import * as bookingController from '../controllers/bookingController';

const router = express.Router();

router
  .route('/')
  .get(bookingController.getAllBookings) 
  .post(bookingController.createBooking); 

router
  .route('/:id')
  .get(bookingController.getBooking)
  .put(bookingController.updateBooking) // <-- Đã đổi updateBookingStatus thành updateBooking
  .delete(bookingController.deleteBooking);

export default router;