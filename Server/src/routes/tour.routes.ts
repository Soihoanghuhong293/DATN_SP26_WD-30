import express from 'express';
import {
  getAllTours,
  createTour,
  getTourById,
  updateTour,
  deleteTour,
} from '../controllers/tour.controller.js';

const router = express.Router();

router
  .route('/')
  .get(getAllTours)   // GET /api/v1/tours -> Lấy hết
  .post(createTour);  // POST /api/v1/tours -> Tạo mới

router
  .route('/:id')
  .get(getTourById)      // GET /api/v1/tours/:id -> Chi tiết
  .patch(updateTour)     // PATCH /api/v1/tours/:id -> Cập nhật
  .delete(deleteTour);   // DELETE /api/v1/tours/:id -> Xoá

export default router;