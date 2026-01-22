import { Request, Response, NextFunction } from 'express';
import Tour from '../models/Tour.js'; // Nhớ thêm đuôi .js
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/AppError.js';

// 1. Lấy danh sách Tour
export const getAllTours = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const tours = await Tour.find();

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: { tours }
  });
});

// 2. Tạo Tour mới
export const createTour = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const newTour = await Tour.create(req.body);

  res.status(201).json({
    status: 'success',
    data: { tour: newTour }
  });
});