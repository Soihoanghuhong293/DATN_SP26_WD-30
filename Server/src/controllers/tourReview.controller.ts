import { Response } from 'express';
import mongoose from 'mongoose';
import Booking from '../models/Booking';
import Tour from '../models/Tour';
import TourReview, { TourSatisfaction } from '../models/TourReview';
import { AuthRequest } from '../middlewares/auth.middleware';

const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

const recomputeTourRating = async (tourId: string) => {
  if (!tourId || !isValidObjectId(tourId)) return;

  const agg = await TourReview.aggregate([
    { $match: { tour_id: new mongoose.Types.ObjectId(tourId) } },
    {
      $group: {
        _id: '$tour_id',
        avg: { $avg: '$stars' },
        count: { $sum: 1 },
      },
    },
  ]);

  const avg = agg?.[0]?.avg ? Number(agg[0].avg) : 0;
  const count = agg?.[0]?.count ? Number(agg[0].count) : 0;

  await Tour.findByIdAndUpdate(
    tourId,
    { $set: { 'rating.average': avg, 'rating.totalReviews': count } },
    { new: false }
  );
};

export const getMyTourReviewByBooking = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const role = String((req.user as any)?.role || 'user');
    if (!userId) return res.status(401).json({ status: 'fail', message: 'Vui lòng đăng nhập' });
    if (role !== 'user') return res.status(403).json({ status: 'fail', message: 'Chỉ tài khoản khách hàng mới dùng được' });

    const bookingId = String(req.query.booking_id || '').trim();
    if (!bookingId || !isValidObjectId(bookingId)) {
      return res.status(400).json({ status: 'fail', message: 'booking_id không hợp lệ' });
    }

    const review = await TourReview.findOne({ booking_id: bookingId, user_id: userId }).populate({
      path: 'tour_id',
      select: 'name slug rating',
    });

    return res.status(200).json({ status: 'success', data: review || null });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const createTourReview = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const role = String((req.user as any)?.role || 'user');
    if (!userId) return res.status(401).json({ status: 'fail', message: 'Vui lòng đăng nhập' });
    if (role !== 'user') return res.status(403).json({ status: 'fail', message: 'Chỉ tài khoản khách hàng mới dùng được' });

    const bookingId = String(req.body?.booking_id || '').trim();
    const stars = Number(req.body?.stars);
    const satisfaction = String(req.body?.satisfaction || '').trim() as TourSatisfaction;

    if (!bookingId || !isValidObjectId(bookingId)) {
      return res.status(400).json({ status: 'fail', message: 'booking_id không hợp lệ' });
    }
    if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
      return res.status(400).json({ status: 'fail', message: 'Số sao phải từ 1 đến 5' });
    }
    if (!['very_satisfied', 'satisfied', 'normal', 'dissatisfied'].includes(satisfaction)) {
      return res.status(400).json({ status: 'fail', message: 'Mức hài lòng không hợp lệ' });
    }

    const booking: any = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ status: 'fail', message: 'Không tìm thấy booking' });

    const uid = booking.user_id?._id?.toString?.() ?? booking.user_id?.toString?.();
    if (!uid || uid !== userId.toString()) {
      return res.status(403).json({ status: 'fail', message: 'Bạn không có quyền đánh giá booking này' });
    }

    if (String(booking.status) === 'cancelled') {
      return res.status(400).json({ status: 'fail', message: 'Booking đã hủy, không thể đánh giá' });
    }

    const stage = String(booking.tour_stage || 'scheduled');
    if (stage !== 'completed') {
      return res.status(400).json({ status: 'fail', message: 'Tour chưa kết thúc, chưa thể đánh giá' });
    }

    const tourId = booking.tour_id?.toString?.();
    if (!tourId || !isValidObjectId(tourId)) {
      return res.status(400).json({ status: 'fail', message: 'Booking không có tour hợp lệ' });
    }

    const created = await TourReview.create({
      booking_id: booking._id,
      tour_id: tourId,
      user_id: userId,
      stars,
      satisfaction,
      status: 'approved',
    });

    await recomputeTourRating(String(tourId));

    return res.status(201).json({ status: 'success', data: created });
  } catch (error: any) {
    if (String(error?.code) === '11000') {
      return res.status(409).json({ status: 'fail', message: 'Booking này đã được đánh giá tour rồi' });
    }
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const createPublicTourReview = async (req: AuthRequest, res: Response) => {
  try {
    const tourId = String(req.body?.tour_id || '').trim();
    const stars = Number(req.body?.stars);
    const guestName = String(req.body?.guest_name || '').trim();

    if (!tourId || !isValidObjectId(tourId)) {
      return res.status(400).json({ status: 'fail', message: 'tour_id không hợp lệ' });
    }
    if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
      return res.status(400).json({ status: 'fail', message: 'Số sao phải từ 1 đến 5' });
    }

    const tour = await Tour.findById(tourId).select('_id');
    if (!tour) return res.status(404).json({ status: 'fail', message: 'Không tìm thấy tour' });

    const created = await TourReview.create({
      tour_id: tourId,
      user_id: req.user?._id,
      guest_name: guestName,
      stars,
      status: 'approved',
    });

    await recomputeTourRating(String(tourId));
    return res.status(201).json({ status: 'success', data: created });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

