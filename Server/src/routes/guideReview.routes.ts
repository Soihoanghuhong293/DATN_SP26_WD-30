import express from 'express';
import { protect, restrictToAdmin } from '../middlewares/auth.middleware';
import * as guideReviewController from '../controllers/guideReview.controller';

const router = express.Router();

router.get('/me', protect, guideReviewController.getMyGuideReviewByBooking);
router.post('/', protect, guideReviewController.createGuideReview);

// admin
router.get('/', protect, restrictToAdmin, guideReviewController.adminListGuideReviews);
router.patch('/:id/status', protect, restrictToAdmin, guideReviewController.adminUpdateGuideReviewStatus);
router.delete('/:id', protect, restrictToAdmin, guideReviewController.adminDeleteGuideReview);

export default router;

