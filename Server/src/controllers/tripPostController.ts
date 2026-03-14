import { Request, Response } from 'express';
import TripPost from '../models/TripPost';
import Booking from '../models/Booking';

// 1. Lấy danh sách bài viết của một booking
export const getTripPosts = async (req: Request, res: Response) => {
  try {
    const { booking_id } = req.query;
    if (!booking_id) {
      return res.status(400).json({ status: 'fail', message: 'Thiếu booking_id' });
    }

    const tripPosts = await TripPost.find({ booking_id })
      .populate('author_id', 'name email')
      .sort({ created_at: -1 });

    res.status(200).json({
      status: 'success',
      results: tripPosts.length,
      data: tripPosts
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// 2. Tạo bài viết mới
export const createTripPost = async (req: Request, res: Response) => {
  try {
    const { booking_id, title, content, images, status } = req.body;
    const author_id = req.user?.id; // Giả sử từ auth middleware

    if (!booking_id || !title || !content) {
      return res.status(400).json({ status: 'fail', message: 'Thiếu thông tin bắt buộc' });
    }

    // Kiểm tra booking tồn tại
    const booking = await Booking.findById(booking_id);
    if (!booking) {
      return res.status(404).json({ status: 'fail', message: 'Booking không tồn tại' });
    }

    const newTripPost = await TripPost.create({
      booking_id,
      title,
      content,
      images: images || [],
      author_id,
      status: status || 'draft'
    });

    res.status(201).json({
      status: 'success',
      data: newTripPost
    });
  } catch (error: any) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};

// 3. Cập nhật bài viết
export const updateTripPost = async (req: Request, res: Response) => {
  try {
    const { title, content, images, status } = req.body;
    const tripPost = await TripPost.findByIdAndUpdate(
      req.params.id,
      { title, content, images, status },
      { new: true, runValidators: true }
    );

    if (!tripPost) {
      return res.status(404).json({ status: 'fail', message: 'Bài viết không tồn tại' });
    }

    res.status(200).json({
      status: 'success',
      data: tripPost
    });
  } catch (error: any) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};

// 4. Xóa bài viết
export const deleteTripPost = async (req: Request, res: Response) => {
  try {
    await TripPost.findByIdAndDelete(req.params.id);
    res.status(204).json({ status: 'success' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};