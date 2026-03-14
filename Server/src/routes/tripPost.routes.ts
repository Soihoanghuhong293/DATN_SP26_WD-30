import express from 'express';
import * as tripPostController from '../controllers/tripPostController';

const router = express.Router();

// Routes cho TripPost
router
  .route('/')
  .get(tripPostController.getTripPosts)
  .post(tripPostController.createTripPost);

router
  .route('/:id')
  .put(tripPostController.updateTripPost)
  .delete(tripPostController.deleteTripPost);

export default router;