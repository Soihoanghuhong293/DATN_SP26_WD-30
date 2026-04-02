import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Restaurant from '../models/Restaurant';

const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

export const getRestaurants = async (req: Request, res: Response) => {
  try {
    const { provider_id } = req.query as { provider_id?: string };
    const filter: any = {};
    if (provider_id && isValidObjectId(provider_id)) {
      filter.provider_id = provider_id;
    }

    const restaurants = await Restaurant.find(filter).sort({ name: 1 });

    res.status(200).json({
      status: 'success',
      results: restaurants.length,
      data: { restaurants },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const createRestaurant = async (req: Request, res: Response) => {
  try {
    const { name, phone, capacity, location, provider_id, status } = req.body || {};

    const cap = typeof capacity === 'number' ? capacity : Number(capacity);

    if (!name || !provider_id || !isValidObjectId(provider_id) || !cap || cap < 1) {
      return res.status(400).json({
        status: 'fail',
        message: 'Thiếu tên nhà hàng / sức chứa hoặc nhà cung cấp không hợp lệ',
      });
    }

    const restaurant = await Restaurant.create({
      name: String(name).trim(),
      phone: phone ? String(phone).trim() : '',
      capacity: cap,
      location: location ? String(location).trim() : '',
      provider_id,
      status: status || 'active',
    });

    res.status(201).json({ status: 'success', data: { restaurant } });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const updateRestaurant = async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ status: 'fail', message: 'Invalid restaurant id' });
    }

    const allowed = ['name', 'phone', 'capacity', 'location', 'status'];
    const filtered: any = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) filtered[k] = req.body[k];
    }
    if (filtered.name) filtered.name = String(filtered.name).trim();
    if (filtered.phone) filtered.phone = String(filtered.phone).trim();
    if (filtered.location) filtered.location = String(filtered.location).trim();
    if (filtered.capacity !== undefined) filtered.capacity = Number(filtered.capacity);

    const restaurant = await Restaurant.findByIdAndUpdate(id, filtered, { new: true, runValidators: true });
    if (!restaurant) {
      return res.status(404).json({ status: 'fail', message: 'Restaurant not found' });
    }

    res.status(200).json({ status: 'success', data: { restaurant } });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const deleteRestaurant = async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ status: 'fail', message: 'Invalid restaurant id' });
    }

    await Restaurant.findByIdAndDelete(id);
    res.status(204).json({ status: 'success', data: null });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

