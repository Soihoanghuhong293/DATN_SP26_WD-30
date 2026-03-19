import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Vehicle from '../models/Vehicle';

const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

export const getVehicles = async (req: Request, res: Response) => {
  try {
    const { provider_id } = req.query as { provider_id?: string };
    const filter: any = {};
    if (provider_id && isValidObjectId(provider_id)) {
      filter.provider_id = provider_id;
    }

    const vehicles = await Vehicle.find(filter).sort({ capacity: -1, plate: 1 });

    res.status(200).json({
      status: 'success',
      results: vehicles.length,
      data: { vehicles },
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

export const createVehicle = async (req: Request, res: Response) => {
  try {
    const { plate, capacity, provider_id, status } = req.body || {};

    if (!plate || !capacity) {
      return res.status(400).json({
        status: 'fail',
        message: 'Thiếu biển số hoặc sức chứa',
      });
    }

    const vehicle = await Vehicle.create({
      plate: String(plate).trim(),
      capacity,
      provider_id: provider_id && isValidObjectId(provider_id) ? provider_id : undefined,
      status: status || 'active',
    });

    res.status(201).json({
      status: 'success',
      data: { vehicle },
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'fail',
      message: error.message,
    });
  }
};

export const updateVehicle = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ status: 'fail', message: 'Invalid vehicle id' });
    }

    const updates = req.body || {};
    const allowed: string[] = ['plate', 'capacity', 'status', 'provider_id'];
    const filtered: Record<string, any> = {};
    for (const key of allowed) {
      if (updates[key] != null) filtered[key] = updates[key];
    }

    const vehicle = await Vehicle.findByIdAndUpdate(id, filtered, { new: true, runValidators: true });
    if (!vehicle) {
      return res.status(404).json({ status: 'fail', message: 'Vehicle not found' });
    }

    res.status(200).json({
      status: 'success',
      data: { vehicle },
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'fail',
      message: error.message,
    });
  }
};

export const deleteVehicle = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ status: 'fail', message: 'Invalid vehicle id' });
    }

    await Vehicle.findByIdAndDelete(id);

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

