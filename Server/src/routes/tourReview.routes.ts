import express from 'express';
import { protect, restrictToAdmin } from '../middlewares/auth.middleware';
import * as tourReviewController from '../controllers/tourReview.controller';

const router = express.Router();

router.get('/me', protect, tourReviewController.getMyTourReviewByBooking);
router.post('/', protect, tourReviewController.createTourReview);
router.put('/me/:id', protect, tourReviewController.updateMyTourReview);
router.delete('/me/:id', protect, tourReviewController.deleteMyTourReview);

// admin
router.get('/', protect, restrictToAdmin, tourReviewController.adminListTourReviews);
router.patch('/:id/status', protect, restrictToAdmin, tourReviewController.adminUpdateTourReviewStatus);
router.delete('/:id', protect, restrictToAdmin, tourReviewController.adminDeleteTourReview);

// public approved reviews theo tour
router.get('/public/list', tourReviewController.listApprovedTourReviews);

export default router;

