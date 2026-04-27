import express from 'express';
import { protect } from '../middlewares/auth.middleware';
import {
  addWishlistTour,
  getMyWishlistTours,
  getWishlistTourStatus,
  removeWishlistTour,
} from '../controllers/wishlistTour.controller.js';

const router = express.Router();

// Bắt buộc đăng nhập
router.use(protect);

// GET /api/v1/wishlist-tours -> danh sách wishlist của tôi
router.get('/', getMyWishlistTours);

// GET /api/v1/wishlist-tours/status/:tourId -> tour này đã được wishlist chưa?
router.get('/status/:tourId', getWishlistTourStatus);

// POST /api/v1/wishlist-tours/:tourId -> thêm wishlist
router.post('/:tourId', addWishlistTour);

// DELETE /api/v1/wishlist-tours/:tourId -> xoá wishlist
router.delete('/:tourId', removeWishlistTour);

export default router;

