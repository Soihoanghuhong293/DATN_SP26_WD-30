import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Hotel from '../models/Hotel';
import Room from '../models/Room';

const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

export const getHotels = async (req: Request, res: Response) => {
  try {
    const { provider_id } = req.query as { provider_id?: string };
    const filter: any = {};
    if (provider_id && isValidObjectId(provider_id)) {
      filter.provider_id = provider_id;
    }

    const hotels = await Hotel.find(filter).sort({ name: 1 });

    res.status(200).json({
      status: 'success',
      results: hotels.length,
      data: { hotels },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const createHotel = async (req: Request, res: Response) => {
  try {
    const { name, address, provider_id, status } = req.body || {};

    if (!name || !provider_id || !isValidObjectId(provider_id)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Thiếu tên khách sạn hoặc nhà cung cấp không hợp lệ',
      });
    }

    const hotel = await Hotel.create({
      name: String(name).trim(),
      address: address ? String(address).trim() : '',
      provider_id,
      status: status || 'active',
    });

    res.status(201).json({ status: 'success', data: { hotel } });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const updateHotel = async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ status: 'fail', message: 'Invalid hotel id' });
    }

    const allowed = ['name', 'address', 'status'];
    const filtered: any = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) filtered[k] = req.body[k];
    }

    const hotel = await Hotel.findByIdAndUpdate(id, filtered, { new: true, runValidators: true });
    if (!hotel) {
      return res.status(404).json({ status: 'fail', message: 'Hotel not found' });
    }

    res.status(200).json({ status: 'success', data: { hotel } });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const deleteHotel = async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ status: 'fail', message: 'Invalid hotel id' });
    }

    await Room.deleteMany({ hotel_id: id });
    await Hotel.findByIdAndDelete(id);

    res.status(204).json({ status: 'success', data: null });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
