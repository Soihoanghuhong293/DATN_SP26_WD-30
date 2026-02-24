import express from 'express';
import {
  getAllGuides,
  getGuideById,
  createGuide,
  updateGuide,
  deleteGuide,
  addGuideRating,
  addTourHistory,
  getGuideStatistics,
} from '../controllers/guide.controller.js';

const router = express.Router();

router
  .route('/')
  .get(getAllGuides)      // GET /api/v1/guides -> Lấy hết hướng dẫn viên
  .post(createGuide);     // POST /api/v1/guides -> Tạo mới hướng dẫn viên

router
  .route('/statistics')
  .get(getGuideStatistics); // GET /api/v1/guides/statistics -> Thống kê hướng dẫn viên

router
  .route('/:id')
  .get(getGuideById)      // GET /api/v1/guides/:id -> Chi tiết hướng dẫn viên
  .patch(updateGuide)     // PATCH /api/v1/guides/:id -> Cập nhật hướng dẫn viên
  .delete(deleteGuide);   // DELETE /api/v1/guides/:id -> Xoá hướng dẫn viên

router
  .route('/:id/rating')
  .post(addGuideRating);  // POST /api/v1/guides/:id/rating -> Thêm đánh giá

router
  .route('/:id/history')
  .post(addTourHistory);  // POST /api/v1/guides/:id/history -> Thêm lịch sử dẫn tour

export default router;
