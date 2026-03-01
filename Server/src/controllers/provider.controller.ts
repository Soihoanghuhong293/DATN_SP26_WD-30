import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Provider from '../models/Provider.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/AppError.js';

const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

export const getAllProviders = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { status, search } = req.query as Record<string, string | undefined>;
  const filter: Record<string, any> = {};
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }
  const providers = await Provider.find(filter).sort({ name: 1 });

  res.status(200).json({
    status: 'success',
    results: providers.length,
    data: { providers },
  });
});

export const getProviderById = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return next(new AppError('Invalid provider id', 400));

  const provider = await Provider.findById(id);
  if (!provider) return next(new AppError('Provider not found', 404));

  res.status(200).json({
    status: 'success',
    data: { provider },
  });
});

export const createProvider = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { name, description, phone, email, address, emergency_contact, contract_info, preferred_pricing, status } =
    req.body;
  const provider = await Provider.create({
    name,
    description: description || '',
    phone: phone || '',
    email: email || '',
    address: address || '',
    emergency_contact: emergency_contact || '',
    contract_info: contract_info || '',
    preferred_pricing: preferred_pricing || '',
    status: status || 'active',
  });

  res.status(201).json({
    status: 'success',
    data: { provider },
  });
});

export const updateProvider = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return next(new AppError('Invalid provider id', 400));

  const updates = req.body;
  const allowedFields = [
    'name',
    'description',
    'phone',
    'email',
    'address',
    'emergency_contact',
    'contract_info',
    'preferred_pricing',
    'status',
  ];
  const filteredUpdates: Record<string, any> = {};
  for (const key of allowedFields) {
    if (updates[key] != null) filteredUpdates[key] = updates[key];
  }

  const provider = await Provider.findByIdAndUpdate(id, filteredUpdates, {
    new: true,
    runValidators: true,
  });

  if (!provider) return next(new AppError('Provider not found', 404));

  res.status(200).json({
    status: 'success',
    data: { provider },
  });
});

export const deleteProvider = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return next(new AppError('Invalid provider id', 400));

  const provider = await Provider.findByIdAndDelete(id);
  if (!provider) return next(new AppError('Provider not found', 404));

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
