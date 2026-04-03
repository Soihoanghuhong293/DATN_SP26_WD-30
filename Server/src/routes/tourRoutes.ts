import express from 'express';
import * as tourController from '../controllers/tourController';
import { optionalProtect } from '../middlewares/auth.middleware';

const router = express.Router();

router
  .route('/')
  .get(optionalProtect, tourController.getAllTours)
  .post(tourController.createTour);

router
  .route('/:id')
  .get(optionalProtect, tourController.getTour)
  .put(tourController.updateTour)   
  .delete(tourController.deleteTour);

export default router;