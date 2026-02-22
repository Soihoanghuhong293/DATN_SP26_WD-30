import { Request, Response, NextFunction } from 'express';
import Guide from '../models/Guide.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/AppError.js';
import mongoose from 'mongoose';

const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

// 1. Lấy danh sách hướng dẫn viên
export const getAllGuides = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { group_type, health_status, search, language } = req.query as Record<string, string | undefined>;

  const filter: Record<string, any> = {};
  if (group_type) filter.group_type = group_type;
  if (health_status) filter.health_status = health_status;
  if (language) filter.languages = language;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const page = Math.max(parseInt((req.query.page as string) || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt((req.query.limit as string) || '20', 10), 1), 100);
  const skip = (page - 1) * limit;

  const guides = await Guide.find(filter)
    .populate('user_id')
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Guide.countDocuments(filter);

  res.status(200).json({
    status: 'success',
    data: {
      guides,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

// 2. Lấy chi tiết một hướng dẫn viên
export const getGuideById = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return next(new AppError('Invalid guide ID format', 400));
  }

  const guide = await Guide.findById(id)
    .populate('user_id')
    .populate('history.tourId');

  if (!guide) {
    return next(new AppError('Guide not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { guide },
  });
});

// 3. Tạo hướng dẫn viên mới
export const createGuide = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const {
    user_id,
    name,
    birtdate,
    avatar,
    phone,
    email,
    address,
    identityCard,
    certificate,
    languages,
    experience,
    group_type,
    health_status,
  } = req.body;

  // Validation
  if (!name || !birtdate || !phone) {
    return next(new AppError('Missing required fields: name, birtdate, phone', 400));
  }

  if (!experience || experience.years == null) {
    return next(new AppError('Experience with years is required', 400));
  }

  // Check duplicate phone
  const existingPhone = await Guide.findOne({ phone });
  if (existingPhone) {
    return next(new AppError('Phone number already exists', 400));
  }

  const newGuide = await Guide.create({
    user_id,
    name,
    birtdate,
    avatar,
    phone,
    email,
    address,
    identityCard,
    certificate: certificate || [],
    languages: languages || ['Vietnamese'],
    experience,
    group_type: group_type || 'domestic',
    health_status: health_status || 'healthy',
    history: [],
    rating: {
      average: 0,
      totalReviews: 0,
      reviews: [],
    },
  });

  res.status(201).json({
    status: 'success',
    data: { guide: newGuide },
  });
});

// 4. Cập nhật thông tin hướng dẫn viên
export const updateGuide = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return next(new AppError('Invalid guide ID format', 400));
  }

  const {
    name,
    birtdate,
    avatar,
    phone,
    email,
    address,
    identityCard,
    certificate,
    languages,
    experience,
    group_type,
    health_status,
  } = req.body;

  // Check if guide exists
  const guide = await Guide.findById(id);
  if (!guide) {
    return next(new AppError('Guide not found', 404));
  }

  // Check duplicate phone if changing
  if (phone && phone !== guide.phone) {
    const existingPhone = await Guide.findOne({ phone });
    if (existingPhone) {
      return next(new AppError('Phone number already exists', 400));
    }
  }

  const updates: Record<string, any> = {};
  if (name !== undefined) updates.name = name;
  if (birtdate !== undefined) updates.birtdate = birtdate;
  if (avatar !== undefined) updates.avatar = avatar;
  if (phone !== undefined) updates.phone = phone;
  if (email !== undefined) updates.email = email;
  if (address !== undefined) updates.address = address;
  if (identityCard !== undefined) updates.identityCard = identityCard;
  if (certificate !== undefined) updates.certificate = certificate;
  if (languages !== undefined) updates.languages = languages;
  if (experience !== undefined) updates.experience = experience;
  if (group_type !== undefined) updates.group_type = group_type;
  if (health_status !== undefined) updates.health_status = health_status;

  const updatedGuide = await Guide.findByIdAndUpdate(id, updates, { new: true, runValidators: true })
    .populate('user_id');

  res.status(200).json({
    status: 'success',
    data: { guide: updatedGuide },
  });
});

// 5. Thêm đánh giá cho hướng dẫn viên
export const addGuideRating = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { score, comment, reviewedBy } = req.body;

  if (!isValidObjectId(id)) {
    return next(new AppError('Invalid guide ID format', 400));
  }

  if (!score || score < 1 || score > 5) {
    return next(new AppError('Score must be between 1 and 5', 400));
  }

  const guide = await Guide.findById(id);
  if (!guide) {
    return next(new AppError('Guide not found', 404));
  }

  // Add review
  const newReview = {
    score,
    comment,
    date: new Date(),
    reviewedBy,
  };

  guide.rating.reviews.push(newReview);

  // Recalculate average rating
  const totalScore = guide.rating.reviews.reduce((sum, review) => sum + review.score, 0);
  guide.rating.average = totalScore / guide.rating.reviews.length;
  guide.rating.totalReviews = guide.rating.reviews.length;

  await guide.save();

  res.status(200).json({
    status: 'success',
    data: { guide },
  });
});

// 6. Thêm lịch sử dẫn tour
export const addTourHistory = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { tourId, tourName, startDate, endDate, groupSize } = req.body;

  if (!isValidObjectId(id)) {
    return next(new AppError('Invalid guide ID format', 400));
  }

  if (!tourName || !startDate || !endDate) {
    return next(new AppError('Missing required fields: tourName, startDate, endDate', 400));
  }

  const guide = await Guide.findById(id);
  if (!guide) {
    return next(new AppError('Guide not found', 404));
  }

  const tourHistory = {
    tourId: tourId ? new mongoose.Types.ObjectId(tourId) : undefined,
    tourName,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    groupSize,
  };

  guide.history.push(tourHistory);
  await guide.save();

  res.status(200).json({
    status: 'success',
    data: { guide },
  });
});

// 7. Xóa hướng dẫn viên
export const deleteGuide = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return next(new AppError('Invalid guide ID format', 400));
  }

  const guide = await Guide.findByIdAndDelete(id);

  if (!guide) {
    return next(new AppError('Guide not found', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// 8. Thống kê hướng dẫn viên theo nhóm
export const getGuideStatistics = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const groupStats = await Guide.aggregate([
    {
      $group: {
        _id: '$group_type',
        count: { $sum: 1 },
        averageRating: { $avg: '$rating.average' },
      },
    },
  ]);

  const healthStats = await Guide.aggregate([
    {
      $group: {
        _id: '$health_status',
        count: { $sum: 1 },
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      groupStats,
      healthStats,
    },
  });
});
