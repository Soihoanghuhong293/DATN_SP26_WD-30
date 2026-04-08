import express from 'express';
import { protect } from '../middlewares/auth.middleware';
import * as guideReviewController from '../controllers/guideReview.controller';

const router = express.Router();

router.get('/me', protect, guideReviewController.getMyGuideReviewByBooking);
router.post('/', protect, guideReviewController.createGuideReview);

export default router;

