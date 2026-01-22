import express from 'express';
import { getAllTours, createTour } from '../controllers/tour.controller.js';

const router = express.Router();

router
  .route('/')
  .get(getAllTours)   // GET /api/v1/tours -> Lấy hết
  .post(createTour);  // POST /api/v1/tours -> Tạo mới

export default router;