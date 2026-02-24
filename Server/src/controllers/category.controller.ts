import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Category from '../models/Category.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/AppError.js';

const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

export const getAllCategories = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { status, search } = req.query as Record<string, string | undefined>;
  const filter: Record<string, any> = {};
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }
  const categories = await Category.find(filter).sort({ name: 1 });

  res.status(200).json({
    status: 'success',
    results: categories.length,
    data: { categories },
  });
});

export const getCategoryById = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return next(new AppError('Invalid category id', 400));

  const category = await Category.findById(id);
  if (!category) return next(new AppError('Category not found', 404));

  res.status(200).json({
    status: 'success',
    data: { category },
  });
});

export const createCategory = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { name, description, status } = req.body;
  const category = await Category.create({
    name,
    description: description || '',
    status: status || 'active',
  });

  res.status(201).json({
    status: 'success',
    data: { category },
  });
});

export const updateCategory = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return next(new AppError('Invalid category id', 400));

  const { name, description, status } = req.body;
  const category = await Category.findByIdAndUpdate(
    id,
    { ...(name != null && { name }), ...(description != null && { description }), ...(status != null && { status }) },
    { new: true, runValidators: true }
  );

  if (!category) return next(new AppError('Category not found', 404));

  res.status(200).json({
    status: 'success',
    data: { category },
  });
});

export const deleteCategory = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return next(new AppError('Invalid category id', 400));

  const category = await Category.findByIdAndDelete(id);
  if (!category) return next(new AppError('Category not found', 404));

  res.status(204).json({
    status: 'success',
    data: null,
  });
});


