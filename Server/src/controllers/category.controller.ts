import { Request, Response, NextFunction } from 'express';
import Category from '../models/Category.js';
import { catchAsync } from '../utils/catchAsync.js';

export const getAllCategories = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const categories = await Category.find().sort({ name: 1 });

  res.status(200).json({
    status: 'success',
    results: categories.length,
    data: { categories },
  });
});

export const createCategory = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { name } = req.body;
  const category = await Category.create({ name });

  res.status(201).json({
    status: 'success',
    data: { category },
  });
});


