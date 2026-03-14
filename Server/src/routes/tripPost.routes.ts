import express from 'express';
import multer from 'multer';
import * as tripPostController from '../controllers/tripPostController';

const router = express.Router();

// Cấu hình multer cho upload ảnh
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Thư mục lưu ảnh
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.mimetype.split('/')[1]);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ cho phép upload file hình ảnh!'));
    }
  }
});

// Routes cho TripPost
router
  .route('/')
  .get(tripPostController.getTripPosts)
  .post(upload.array('images', 10), tripPostController.createTripPost); // Thêm upload middleware

router
  .route('/:id')
  .put(upload.array('images', 10), tripPostController.updateTripPost) // Thêm upload
  .delete(tripPostController.deleteTripPost);

export default router;