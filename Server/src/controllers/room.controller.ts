import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Room from '../models/Room';
import Hotel from '../models/Hotel';

const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

export const getRooms = async (req: Request, res: Response) => {
  try {
    const { provider_id, hotel_id } = req.query as { provider_id?: string; hotel_id?: string };
    const filter: any = {};
    if (provider_id && isValidObjectId(provider_id)) {
      filter.provider_id = provider_id;
    }
    if (hotel_id && isValidObjectId(hotel_id)) {
      filter.hotel_id = hotel_id;
    }

    const rooms = await Room.find(filter)
      .populate('hotel_id', 'name address')
      .sort({ room_number: 1 });

    res.status(200).json({
      status: 'success',
      results: rooms.length,
      data: { rooms },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const createRoom = async (req: Request, res: Response) => {
  try {
    const { hotel_id, room_number, max_occupancy, status, provider_id } = req.body || {};

    if (!hotel_id || !room_number || !isValidObjectId(hotel_id)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Thiếu khách sạn hoặc số phòng không hợp lệ',
      });
    }

    const hotel = await Hotel.findById(hotel_id);
    if (!hotel) {
      return res.status(404).json({ status: 'fail', message: 'Không tìm thấy khách sạn' });
    }

    const pid = provider_id && isValidObjectId(provider_id) ? provider_id : hotel.provider_id;

    const room = await Room.create({
      hotel_id,
      room_number: String(room_number).trim(),
      max_occupancy: typeof max_occupancy === 'number' && max_occupancy > 0 ? max_occupancy : 2,
      status: status || 'active',
      provider_id: pid,
    });

    const populated = await Room.findById(room._id).populate('hotel_id', 'name address');

    res.status(201).json({ status: 'success', data: { room: populated } });
  } catch (error: any) {
    if (error?.code === 11000) {
      return res.status(400).json({
        status: 'fail',
        message: 'Số phòng đã tồn tại trong khách sạn này',
      });
    }
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const updateRoom = async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ status: 'fail', message: 'Invalid room id' });
    }

    const allowed = ['room_number', 'max_occupancy', 'status'];
    const filtered: any = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) filtered[k] = req.body[k];
    }
    if (filtered.room_number) filtered.room_number = String(filtered.room_number).trim();

    const room = await Room.findByIdAndUpdate(id, filtered, { new: true, runValidators: true }).populate(
      'hotel_id',
      'name address'
    );
    if (!room) {
      return res.status(404).json({ status: 'fail', message: 'Room not found' });
    }

    res.status(200).json({ status: 'success', data: { room } });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const deleteRoom = async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ status: 'fail', message: 'Invalid room id' });
    }

    await Room.findByIdAndDelete(id);

    res.status(204).json({ status: 'success', data: null });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
