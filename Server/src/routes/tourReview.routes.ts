import express from 'express';
import { protect, restrictToAdmin } from '../middlewares/auth.middleware';
import * as tourReviewController from '../controllers/tourReview.controller';

const router = express.Router();

router.get('/me', protect, tourReviewController.getMyTourReviewByBooking);
router.get('/summary/:tourId', tourReviewController.getTourReviewSummary);
router.get('/tour/:tourId', tourReviewController.listTourReviewsByTour);
router.post('/', protect, tourReviewController.createTourReview);
// Không cho đánh giá nếu chưa có booking hợp lệ
router.post('/public', (_req, res) => res.status(403).json({ status: 'fail', message: 'Bạn cần đặt tour và tour đã kết thúc để đánh giá' }));

// admin placeholders (dùng sau nếu cần duyệt/xóa)
router.get('/', protect, restrictToAdmin, (_req, res) => res.status(501).json({ status: 'fail', message: 'Chưa hỗ trợ' }));

export default router;

