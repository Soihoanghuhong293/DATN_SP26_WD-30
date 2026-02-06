import { Request, Response, NextFunction } from 'express';
import Tour from '../models/Tour.js'; // Nhớ thêm đuôi .js
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/AppError.js';
import mongoose from 'mongoose';

const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

const normalizeStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === 'string' ? v.trim() : ''))
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    // allow either newline-separated or comma-separated
    const split = value.includes('\n') ? value.split('\n') : value.split(',');
    return split.map((s) => s.trim()).filter(Boolean);
  }
  return [];
};

const mapLegacyBody = (body: any) => {
  // Backward compatibility: accept basePrice/duration/category from old schema
  if (body && body.price == null && body.basePrice != null) body.price = body.basePrice;
  if (body && body.duration_ == null && body.duration != null) body.duration_ = body.duration;
  if (body && body.category_id == null && body.category != null) body.category_id = body.category;

  if (body && body.policies != null) body.policies = normalizeStringArray(body.policies);
  if (body && body.suppliers != null) body.suppliers = normalizeStringArray(body.suppliers);

  return body;
};

// 1. Lấy danh sách Tour
export const getAllTours = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { status, category_id, search } = req.query as Record<string, string | undefined>;

  const filter: Record<string, any> = {};
  if (status) filter.status = status;
  if (category_id) filter.category_id = category_id;
  if (search) {
    filter.$or = [
      { description: { $regex: search, $options: 'i' } },
      { name: { $regex: search, $options: 'i' } },
    ];
  }

  const page = Math.max(parseInt((req.query.page as string) || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt((req.query.limit as string) || '20', 10), 1), 100);
  const skip = (page - 1) * limit;

  const [tours, total] = await Promise.all([
    Tour.find(filter).sort({ created_at: -1 }).skip(skip).limit(limit),
    Tour.countDocuments(filter),
  ]);

  res.status(200).json({
    status: 'success',
    results: tours.length,
    total,
    page,
    limit,
    data: { tours }
  });
});

// 2. Tạo Tour mới
export const createTour = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const payload = mapLegacyBody({ ...req.body });
  const newTour = await Tour.create(payload);

  res.status(201).json({
    status: 'success',
    data: { tour: newTour }
  });
});

// 3. Lấy chi tiết Tour
export const getTourById = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return next(new AppError('Invalid tour id', 400));

  const tour = await Tour.findById(id);
  if (!tour) return next(new AppError('Tour not found', 404));

  res.status(200).json({
    status: 'success',
    data: { tour },
  });
});

// 4. Cập nhật Tour
export const updateTour = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return next(new AppError('Invalid tour id', 400));

  const payload = mapLegacyBody({ ...req.body });
  const tour = await Tour.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  if (!tour) return next(new AppError('Tour not found', 404));

  res.status(200).json({
    status: 'success',
    data: { tour },
  });
});

// 5. Xoá Tour
export const deleteTour = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return next(new AppError('Invalid tour id', 400));

  const tour = await Tour.findByIdAndDelete(id);
  if (!tour) return next(new AppError('Tour not found', 404));

  res.status(204).json({
    status: 'success',
    data: null,
  });
});