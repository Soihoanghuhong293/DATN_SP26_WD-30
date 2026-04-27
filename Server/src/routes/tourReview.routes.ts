import express from 'express';
import { protect, restrictToAdmin } from '../middlewares/auth.middleware';
import * as tourReviewController from '../controllers/tourReview.controller';

const router = express.Router();

router.get('/me', protect, tourReviewController.getMyTourReviewByBooking);
router.get('/summary/:tourId', tourReviewController.getTourReviewSummary);
router.get('/tour/:tourId', tourReviewController.listTourReviewsByTour);
router.post('/', protect, tourReviewController.createTourReview);
router.post('/public', tourReviewController.createPublicTourReview);

// admin placeholders (dùng sau nếu cần duyệt/xóa)
router.get('/', protect, restrictToAdmin, (_req, res) => res.status(501).json({ status: 'fail', message: 'Chưa hỗ trợ' }));

export default router;

