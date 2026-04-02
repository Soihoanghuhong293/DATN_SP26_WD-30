import express from 'express';
import {
  getRestaurants,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
} from '../controllers/restaurant.controller';

const router = express.Router();

router.route('/').get(getRestaurants).post(createRestaurant);
router.route('/:id').patch(updateRestaurant).delete(deleteRestaurant);

export default router;

