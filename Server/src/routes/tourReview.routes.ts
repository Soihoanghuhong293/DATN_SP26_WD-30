import express from 'express';
import { protect, restrictToAdmin } from '../middlewares/auth.middleware';
import * as tourReviewController from '../controllers/tourReview.controller';

const router = express.Router();

router.get('/me', protect, tourReviewController.getMyTourReviewByBooking);
router.post('/', protect, tourReviewController.createTourReview);

// admin placeholders (dùng sau nếu cần duyệt/xóa)
router.get('/', protect, restrictToAdmin, (_req, res) => res.status(501).json({ status: 'fail', message: 'Chưa hỗ trợ' }));

export default router;

