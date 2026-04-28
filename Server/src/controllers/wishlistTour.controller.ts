import { Request, Response } from 'express';
import mongoose from 'mongoose';
import type { AuthRequest } from '../middlewares/auth.middleware';
import Tour from '../models/Tour';
import WishlistTour from '../models/WishlistTour';

export const getMyWishlistTours = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?._id;
    if (!userId) return res.status(401).json({ message: 'Vui lòng đăng nhập' });

    const items = await WishlistTour.find({ user_id: userId })
      .populate({
        path: 'tour_id',
        populate: [
          { path: 'category_id' },
          { path: 'primary_guide_id', select: 'name email phone role' },
          { path: 'secondary_guide_ids', select: 'name email phone role' },
        ],
      })
      .sort({ created_at: -1 });

    res.status(200).json({
      status: 'success',
      total: items.length,
      data: items,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const addWishlistTour = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?._id;
    if (!userId) return res.status(401).json({ message: 'Vui lòng đăng nhập' });

    const tourId = req.params.tourId || req.body?.tour_id;
    if (!tourId || !mongoose.Types.ObjectId.isValid(String(tourId))) {
      return res.status(400).json({ message: 'tour_id không hợp lệ' });
    }

    const tour = await Tour.findById(tourId).select('_id status');
    if (!tour) return res.status(404).json({ message: 'Không tìm thấy tour' });

    // Khung chức năng: hiện vẫn cho lưu mọi tour tồn tại (kể cả draft/hidden) để sau dễ siết rule.
    const existed = await WishlistTour.findOne({ user_id: userId, tour_id: tourId }).select('_id');
    if (existed) {
      return res.status(200).json({ status: 'success', message: 'Tour đã có trong danh sách yêu thích' });
    }

    await WishlistTour.create({ user_id: userId, tour_id: tourId });

    res.status(201).json({ status: 'success', message: 'Đã thêm vào danh sách yêu thích' });
  } catch (error: any) {
    // duplicate key (unique index)
    if (error?.code === 11000) {
      return res.status(200).json({ status: 'success', message: 'Tour đã có trong danh sách yêu thích' });
    }
    res.status(500).json({ message: error.message });
  }
};

export const removeWishlistTour = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?._id;
    if (!userId) return res.status(401).json({ message: 'Vui lòng đăng nhập' });

    const tourId = req.params.tourId;
    if (!tourId || !mongoose.Types.ObjectId.isValid(String(tourId))) {
      return res.status(400).json({ message: 'tour_id không hợp lệ' });
    }

    await WishlistTour.deleteOne({ user_id: userId, tour_id: tourId });

    res.status(200).json({ status: 'success', message: 'Đã xoá khỏi danh sách yêu thích' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getWishlistTourStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?._id;
    if (!userId) return res.status(401).json({ message: 'Vui lòng đăng nhập' });

    const tourId = req.params.tourId;
    if (!tourId || !mongoose.Types.ObjectId.isValid(String(tourId))) {
      return res.status(400).json({ message: 'tour_id không hợp lệ' });
    }

    const existed = await WishlistTour.exists({ user_id: userId, tour_id: tourId });

    res.status(200).json({
      status: 'success',
      data: { isWishlisted: Boolean(existed) },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

