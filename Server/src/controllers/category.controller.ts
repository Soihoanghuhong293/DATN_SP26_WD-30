import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Category from '../models/Category.js';
import Tour from '../models/Tour.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/AppError.js';

const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

const normalizeParentId = (value: any): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (raw === 'null') return null;
  return raw;
};

const assertNoCycle = async (categoryId: string, newParentId: string | null) => {
  if (!newParentId) return;
  if (newParentId === categoryId) throw new AppError('Danh mục cha không hợp lệ (trùng chính nó)', 400);

  const visited = new Set<string>([categoryId]);
  let current: string | null = newParentId;

  while (current) {
    if (visited.has(current)) {
      throw new AppError('Danh mục cha không hợp lệ (gây vòng lặp)', 400);
    }
    visited.add(current);

    const parentDoc: any = await Category.findById(current).select('parent_id');
    if (!parentDoc) throw new AppError('Danh mục cha không tồn tại', 400);

    current = parentDoc.parent_id ? String(parentDoc.parent_id) : null;
  }
};

const buildCategoryTree = (categories: any[]) => {
  const byId = new Map<string, any>();
  const roots: any[] = [];

  for (const c of categories) {
    const obj = typeof c.toObject === 'function' ? c.toObject() : c;
    obj.children = [];
    byId.set(String(obj._id || obj.id), obj);
  }

  for (const c of byId.values()) {
    const parentId = c.parent_id ? String(c.parent_id) : null;
    if (parentId && byId.has(parentId)) {
      byId.get(parentId).children.push(c);
    } else {
      roots.push(c);
    }
  }

  const sortRecursive = (nodes: any[]) => {
    nodes.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'vi'));
    for (const n of nodes) sortRecursive(n.children || []);
  };
  sortRecursive(roots);

  return roots;
};

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

export const getCategoryTree = catchAsync(async (req: Request, res: Response) => {
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
  const tree = buildCategoryTree(categories);

  res.status(200).json({
    status: 'success',
    results: categories.length,
    data: { categories: tree },
  });
});

export const getCategoryById = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const id = String((req.params as any).id);
  if (!isValidObjectId(id)) return next(new AppError('Invalid category id', 400));

  const category = await Category.findById(id);
  if (!category) return next(new AppError('Category not found', 404));

  res.status(200).json({
    status: 'success',
    data: { category },
  });
});

export const createCategory = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { name, description, status, parent_id } = req.body;
  const normalizedParentId = normalizeParentId(parent_id);
  if (normalizedParentId !== undefined && normalizedParentId !== null && !isValidObjectId(normalizedParentId)) {
    return next(new AppError('Invalid parent category id', 400));
  }
  if (normalizedParentId) {
    const parent = await Category.findById(normalizedParentId);
    if (!parent) return next(new AppError('Danh mục cha không tồn tại', 400));
  }
  const category = await Category.create({
    name,
    description: description || '',
    parent_id: normalizedParentId ?? null,
    status: status || 'active',
  });

  res.status(201).json({
    status: 'success',
    data: { category },
  });
});

export const updateCategory = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const id = String((req.params as any).id);
  if (!isValidObjectId(id)) return next(new AppError('Invalid category id', 400));

  const { name, description, status, parent_id } = req.body;
  const normalizedParentId = normalizeParentId(parent_id);
  if (normalizedParentId !== undefined && normalizedParentId !== null && !isValidObjectId(normalizedParentId)) {
    return next(new AppError('Invalid parent category id', 400));
  }
  if (normalizedParentId !== undefined) {
    await assertNoCycle(id, normalizedParentId);
  }

  const category = await Category.findByIdAndUpdate(
    id,
    {
      ...(name != null && { name }),
      ...(description != null && { description }),
      ...(status != null && { status }),
      ...(normalizedParentId !== undefined && { parent_id: normalizedParentId }),
    },
    { new: true, runValidators: true }
  );

  if (!category) return next(new AppError('Category not found', 404));

  res.status(200).json({
    status: 'success',
    data: { category },
  });
});

export const deleteCategory = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const id = String((req.params as any).id);
  if (!isValidObjectId(id)) return next(new AppError('Invalid category id', 400));

  const hasChildren = await Category.exists({ parent_id: id });
  if (hasChildren) return next(new AppError('Không thể xoá danh mục đang có danh mục con', 409));

  const usedByTour = await Tour.exists({ category_id: id });
  if (usedByTour) return next(new AppError('Không thể xoá danh mục đang được sử dụng bởi tour', 409));

  const category = await Category.findByIdAndDelete(id);
  if (!category) return next(new AppError('Category not found', 404));

  res.status(204).json({
    status: 'success',
    data: null,
  });
});


