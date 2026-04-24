import express from 'express';
import * as bookingController from '../controllers/bookingController';
import { protect, restrictToGuide, restrictToAdmin, optionalProtect } from '../middlewares/auth.middleware';

const router = express.Router();

// Phải đặt trước /:id để "guide" không bị hiểu là id
router.get('/guide/me', protect, restrictToGuide, bookingController.getMyBookings);
router.get('/guide/:id', protect, restrictToGuide, bookingController.getMyBookingDetail);
router.patch('/guide/:id/checkin', protect, restrictToGuide, bookingController.checkInPassenger);
router.patch('/guide/:id/stage', protect, restrictToGuide, bookingController.updateTourStage);
router.patch('/guide/:id/diary', protect, restrictToGuide, bookingController.addDiaryEntryForGuide);
router.post('/:id/auto-allocate-cars', protect, bookingController.autoAllocateCars);
router.post('/:id/auto-allocate-rooms', protect, bookingController.autoAllocateRooms);
router.post('/:id/auto-allocate-services', protect, bookingController.autoAllocateCarsAndRooms);

router.get('/me', protect, bookingController.getMyBookingsForUser);
router.get('/me/:id', protect, bookingController.getMyBookingDetailForUser);
router.post('/me/:id/cancel-request', protect, bookingController.requestCancelForUser);

// ===== ADMIN: xử lý yêu cầu hủy =====
router.get('/cancel-requests', protect, restrictToAdmin, bookingController.getCancelRequestsForAdmin);
router.get('/cancel-requests/:id', protect, restrictToAdmin, bookingController.getCancelRequestDetailForAdmin);
router.patch('/cancel-requests/:id/approve', protect, restrictToAdmin, bookingController.approveCancelRequestForAdmin);
router.patch('/cancel-requests/:id/reject', protect, restrictToAdmin, bookingController.rejectCancelRequestForAdmin);
router.patch('/cancel-requests/:id/refunded', protect, restrictToAdmin, bookingController.markCancelRequestRefundedForAdmin);

router
  .route('/')
  .get(bookingController.getAllBookings)
  .post(optionalProtect, bookingController.createBooking);

router
  .route('/:id')
  .get(bookingController.getBooking)
  .put(bookingController.updateBooking) // <-- Đã đổi updateBookingStatus thành updateBooking
  .delete(bookingController.deleteBooking);

// Giả lập thanh toán MoMo (sandbox/dev) cho một đơn booking cụ thể
router.post('/:id/payments/momo', bookingController.initMomoPaymentMock);

export default router;