import { Request, Response } from 'express';
import Tour from '../models/Tour';
import Booking from '../models/Booking';
import TourTemplate from '../models/TourTemplate';
import type { AuthRequest } from '../middlewares/auth.middleware';
import VehicleAllocation from '../models/VehicleAllocation';
import RoomAllocation from '../models/RoomAllocation';
import VehicleAssignment from '../models/VehicleAssignment';
import RoomAssignment from '../models/RoomAssignment';
import { autoAllocateCarsForTrip, autoAllocateRoomsForTrip } from '../services/allocation.service';
import Passenger from '../models/Passenger';
import TripVehicle from '../models/TripVehicle';
import SeatingAllocation from '../models/SeatingAllocation';
import Vehicle from '../models/Vehicle';
import TripRoom from '../models/TripRoom';
import RoomingAllocation from '../models/RoomingAllocation';
import Room from '../models/Room';
import Hotel from '../models/Hotel';
import User from '../models/user.model';
import Guide from '../models/Guide';
import TourTrip, { TripStatus } from '../models/TourTrip';
import { validateTripAllocationsForStart } from '../utils/tripAllocationValidation';

const normalizeDateStr = (value: any) => {
  if (!value) return '';
  const raw = String(value).trim();
  if (!raw) return '';
  if (raw.includes('T')) return raw.split('T')[0];
  return raw;
};

const normalizeTripDate = (value: any) => {
  const s = normalizeDateStr(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const raw = String(value ?? '').trim();
  const slash = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    return `${slash[3]}-${slash[2].padStart(2, '0')}-${slash[1].padStart(2, '0')}`;
  }
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return '';
};

const parseYyyyMmDd = (dateStr: string): Date | null => {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(String(dateStr || '').trim())) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};

const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

const rangesOverlap = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) => {
  return aStart.getTime() <= bEnd.getTime() && bStart.getTime() <= aEnd.getTime();
};

const tripKeyOf = (tourId: string, dateStr: string) => `${tourId}:${dateStr}`;

async function filterTourSchedulesToOpeningTripsOnly(tours: any[]): Promise<any[]> {
  if (!Array.isArray(tours) || tours.length === 0) return [];
  const ids = tours.map((t: any) => t._id).filter(Boolean);
  const rows = await TourTrip.find({ tour_id: { $in: ids }, status: 'OPENING' })
    .select('tour_id trip_date trip_key')
    .lean();

  const allowedDatesByTourId = new Map<string, Set<string>>();
  for (const r of rows as any[]) {
    const tid = String(r.tour_id || '');
    let d = normalizeTripDate(r.trip_date);
    if (!d && r.trip_key) {
      const tk = String(r.trip_key);
      const pref = `${tid}:`;
      if (tk.startsWith(pref)) d = normalizeTripDate(tk.slice(pref.length));
    }
    if (!tid || !d) continue;
    if (!allowedDatesByTourId.has(tid)) allowedDatesByTourId.set(tid, new Set());
    allowedDatesByTourId.get(tid)!.add(d);
  }

  const out: any[] = [];
  for (const tour of tours) {
    const tid = String(tour._id || '');
    const allowed = allowedDatesByTourId.get(tid);
    const plain = typeof tour.toObject === 'function' ? tour.toObject() : { ...tour };
    const ds = Array.isArray(plain.departure_schedule) ? plain.departure_schedule : [];
    if (!allowed || allowed.size === 0) continue;
    plain.departure_schedule = ds.filter((s: any) => allowed.has(normalizeTripDate(s?.date)));
    if (plain.departure_schedule.length === 0) continue;
    out.push(plain);
  }
  return out;
}

const TRIP_STATUSES: TripStatus[] = ['DRAFT', 'OPENING', 'CLOSED', 'COMPLETED'];

const canTransitionTripStatus = (from: TripStatus, to: TripStatus) => {
  if (from === to) return true;
  if (from === 'COMPLETED') return false; // completed = read-only
  if (from === 'DRAFT') return to === 'OPENING';
  if (from === 'OPENING') return to === 'DRAFT' || to === 'CLOSED';
  if (from === 'CLOSED') return to === 'OPENING' || to === 'COMPLETED';
  return false;
};

const ensureTripDoc = async (tourId: string, dateStr: string) => {
  const trip_key = tripKeyOf(tourId, dateStr);
  const doc = await TourTrip.findOneAndUpdate(
    { trip_key },
    { $setOnInsert: { tour_id: tourId, trip_key, trip_date: dateStr, status: 'DRAFT' as TripStatus } },
    { upsert: true, new: true }
  );
  return doc;
};

export const getTripStatusByTourAndDate = async (req: Request, res: Response) => {
  try {
    const tourId = String(req.params.id || '');
    const dateStr = normalizeTripDate(req.params.date);
    if (!tourId || !dateStr) {
      return res.status(400).json({ status: 'fail', message: 'Thiếu tourId hoặc date (YYYY-MM-DD)' });
    }

    const trip = await ensureTripDoc(tourId, dateStr);
    return res.status(200).json({ status: 'success', data: { status: trip.status, trip_key: trip.trip_key } });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message || 'Lỗi khi lấy trạng thái chuyến đi' });
  }
};

export const updateTripStatusByTourAndDate = async (req: Request, res: Response) => {
  try {
    const tourId = String(req.params.id || '');
    const dateStr = normalizeTripDate(req.params.date);
    const nextRaw = String(req.body?.status || '').toUpperCase().trim();
    const next = TRIP_STATUSES.includes(nextRaw as TripStatus) ? (nextRaw as TripStatus) : null;

    if (!tourId || !dateStr) {
      return res.status(400).json({ status: 'fail', message: 'Thiếu tourId hoặc date (YYYY-MM-DD)' });
    }
    if (!next) {
      return res.status(400).json({ status: 'fail', message: 'Trạng thái không hợp lệ' });
    }

    const trip = await ensureTripDoc(tourId, dateStr);
    const prev = trip.status as TripStatus;

    // Admin rule (per requirement): only allow DRAFT -> OPENING
    if (!(prev === 'DRAFT' && next === 'OPENING')) {
      return res.status(400).json({
        status: 'fail',
        message: 'Admin chỉ được chuyển trạng thái từ DRAFT sang OPENING.',
      });
    }

    trip.status = 'OPENING';
    await trip.save();
    return res.status(200).json({ status: 'success', data: { status: trip.status } });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message || 'Lỗi khi cập nhật trạng thái chuyến đi' });
  }
};

export const guideStartTrip = async (req: AuthRequest, res: Response) => {
  try {
    const tourId = String(req.params.id || '');
    const dateStr = normalizeTripDate(req.params.date);
    if (!tourId || !dateStr) {
      return res.status(400).json({ status: 'fail', message: 'Thiếu tourId hoặc date (YYYY-MM-DD)' });
    }
    // Không cho HDV bắt đầu nếu còn booking chưa thanh toán đủ
    const unpaidCount = await Booking.countDocuments({
      tour_id: tourId,
      status: { $ne: 'cancelled' },
      startDate: {
        $gte: new Date(`${dateStr}T00:00:00.000Z`),
        $lte: new Date(`${dateStr}T23:59:59.999Z`),
      },
      $or: [{ payment_status: { $exists: false } }, { payment_status: { $ne: 'paid' } }],
    });
    if (unpaidCount > 0) {
      return res.status(400).json({
        status: 'fail',
        message: `Không thể bắt đầu chuyến đi vì còn ${unpaidCount} booking chưa thanh toán đủ. Vui lòng yêu cầu điều hành xác nhận thanh toán trước khi bắt đầu.`,
      });
    }

    const allocCheck = await validateTripAllocationsForStart(tourId, dateStr);
    if (!allocCheck.ok) {
      return res.status(400).json({ status: 'fail', message: allocCheck.message });
    }

    const trip = await ensureTripDoc(tourId, dateStr);
    const prev = trip.status as TripStatus;
    if (prev !== 'OPENING') {
      return res.status(400).json({ status: 'fail', message: 'Chỉ được Bắt đầu khi trạng thái là OPENING.' });
    }
    trip.status = 'CLOSED'; // display = "Đang chạy"
    await trip.save();
    return res.status(200).json({ status: 'success', data: { status: trip.status } });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message || 'Lỗi khi bắt đầu chuyến đi' });
  }
};

export const guideEndTrip = async (req: AuthRequest, res: Response) => {
  try {
    const tourId = String(req.params.id || '');
    const dateStr = normalizeTripDate(req.params.date);
    if (!tourId || !dateStr) {
      return res.status(400).json({ status: 'fail', message: 'Thiếu tourId hoặc date (YYYY-MM-DD)' });
    }
    const trip = await ensureTripDoc(tourId, dateStr);
    const prev = trip.status as TripStatus;
    if (prev !== 'CLOSED') {
      return res.status(400).json({ status: 'fail', message: 'Chỉ được Kết thúc khi trạng thái là Đang chạy.' });
    }
    trip.status = 'COMPLETED';
    await trip.save();
    return res.status(200).json({ status: 'success', data: { status: trip.status } });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message || 'Lỗi khi kết thúc chuyến đi' });
  }
};

const tripDateRange = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-').map((x) => Number(x));
  const start = new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
  const end = new Date(y, (m || 1) - 1, (d || 1) + 1, 0, 0, 0, 0);
  return { start, end };
};

export const tripAutoAllocateCars = async (req: Request, res: Response) => {
  try {
    const tourId = String(req.params.id || '');
    const dateStr = normalizeTripDate(req.params.date);
    if (!tourId || !dateStr) {
      return res.status(400).json({ status: 'fail', message: 'Thiếu tourId hoặc date (YYYY-MM-DD)' });
    }

    const tour: any = await Tour.findById(tourId).lean();
    if (!tour) return res.status(404).json({ status: 'fail', message: 'Không tìm thấy tour' });
    const trip = Array.isArray(tour?.departure_schedule)
      ? tour.departure_schedule.find((x: any) => normalizeDateStr(x?.date) === dateStr)
      : null;
    const slots = Number(trip?.slots || 0);
    const result = await autoAllocateCarsForTrip({ tourId, startDate: dateStr, slots });
    if (!result.success) return res.status(400).json({ status: 'fail', ...result });
    return res.status(200).json({ status: 'success', data: result.data });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message || 'Lỗi khi phân bổ xe theo trip' });
  }
};

export const tripAutoAllocateRooms = async (req: Request, res: Response) => {
  try {
    const tourId = String(req.params.id || '');
    const dateStr = normalizeTripDate(req.params.date);
    if (!tourId || !dateStr) {
      return res.status(400).json({ status: 'fail', message: 'Thiếu tourId hoặc date (YYYY-MM-DD)' });
    }

    const tour: any = await Tour.findById(tourId).lean();
    if (!tour) return res.status(404).json({ status: 'fail', message: 'Không tìm thấy tour' });
    const trip = Array.isArray(tour?.departure_schedule)
      ? tour.departure_schedule.find((x: any) => normalizeDateStr(x?.date) === dateStr)
      : null;
    const slots = Number(trip?.slots || 0);
    const result = await autoAllocateRoomsForTrip({ tourId, startDate: dateStr, slots });
    if (!result.success) return res.status(400).json({ status: 'fail', ...result });
    return res.status(200).json({ status: 'success', data: result.data });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message || 'Lỗi khi phân bổ phòng theo trip' });
  }
};

export const getTripAllocations = async (req: Request, res: Response) => {
  try {
    const tourId = String(req.params.id || '');
    const dateStr = normalizeTripDate(req.params.date);
    if (!tourId || !dateStr) {
      return res.status(400).json({ status: 'fail', message: 'Thiếu tourId hoặc date (YYYY-MM-DD)' });
    }
    const tripKey = tripKeyOf(tourId, dateStr);
    const cars = await VehicleAllocation.find({ trip_key: tripKey }).sort({ day_no: 1, plate: 1 }).lean();
    const rooms = await RoomAllocation.find({ trip_key: tripKey })
      .sort({ day_no: 1, hotel_name: 1, room_number: 1 })
      .lean();
    return res.status(200).json({ status: 'success', data: { cars, rooms } });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message || 'Lỗi khi lấy phân bổ theo trip' });
  }
};

export const getTripGuests = async (req: Request, res: Response) => {
  try {
    const tourId = String(req.params.id || '');
    const dateStr = normalizeTripDate(req.params.date);
    if (!tourId || !dateStr) {
      return res.status(400).json({ status: 'fail', message: 'Thiếu tourId hoặc date (YYYY-MM-DD)' });
    }
    const { start, end } = tripDateRange(dateStr);
    const bookings = await Booking.find({
      tour_id: tourId,
      status: { $ne: 'cancelled' },
      startDate: { $gte: start, $lt: end },
    })
      .sort({ created_at: -1 })
      .lean();

    const guests = bookings.flatMap((booking: any) => {
      const bookingId = String(booking?._id || '');
      const out: any[] = [];
      out.push({
        guest_key: `${bookingId}:leader`,
        booking_id: bookingId,
        kind: 'leader',
        name: booking?.customer_name || '—',
        phone: booking?.customer_phone,
        type: 'leader',
      });
      const list = booking?.passengers || booking?.guests || booking?.guest_list || [];
      if (Array.isArray(list)) {
        list.forEach((g: any, idx: number) => {
          const subId = g?._id ? String(g._id) : `p${idx}`;
          out.push({
            guest_key: `${bookingId}:${subId}`,
            booking_id: bookingId,
            kind: 'passenger',
            name: g?.name || g?.full_name || `Khách ${idx + 1}`,
            phone: g?.phone || g?.phoneNumber,
            type: g?.type,
          });
        });
      }
      return out;
    });

    return res.status(200).json({ status: 'success', data: guests });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message || 'Lỗi khi lấy danh sách khách theo trip' });
  }
};

export const getTripVehicleAssignments = async (req: Request, res: Response) => {
  try {
    const tourId = String(req.params.id || '');
    const dateStr = normalizeTripDate(req.params.date);
    if (!tourId || !dateStr) return res.status(400).json({ status: 'fail', message: 'Thiếu tourId hoặc date' });
    const tripKey = tripKeyOf(tourId, dateStr);
    const rows = await VehicleAssignment.find({ trip_key: tripKey }).sort({ day_no: 1, guest_key: 1 }).lean();
    return res.status(200).json({ status: 'success', data: rows });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message || 'Lỗi khi lấy vehicle assignments' });
  }
};

export const upsertTripVehicleAssignment = async (req: Request, res: Response) => {
  try {
    const tourId = String(req.params.id || '');
    const dateStr = normalizeTripDate(req.params.date);
    if (!tourId || !dateStr) return res.status(400).json({ status: 'fail', message: 'Thiếu tourId hoặc date' });
    const tripKey = tripKeyOf(tourId, dateStr);
    const { guest_key, day_no, vehicle_allocation_id, seat_number } = req.body || {};
    const guestKey = String(guest_key || '').trim();
    const dayNo = Math.max(1, Number(day_no || 1));
    const vehicleAllocId = String(vehicle_allocation_id || '').trim();
    const seat = String(seat_number || '').trim();
    if (!guestKey || !vehicleAllocId || !seat) {
      return res.status(400).json({ status: 'fail', message: 'Thiếu guest_key / vehicle_allocation_id / seat_number' });
    }
    const alloc = await VehicleAllocation.findOne({ _id: vehicleAllocId, trip_key: tripKey, day_no: dayNo }).lean();
    if (!alloc) return res.status(400).json({ status: 'fail', message: 'Xe allocation không hợp lệ' });
    const [bookingId] = guestKey.split(':');
    const doc = await VehicleAssignment.findOneAndUpdate(
      { trip_key: tripKey, day_no: dayNo, guest_key: guestKey },
      {
        $set: {
          trip_key: tripKey,
          tour_id: tourId,
          trip_date: dateStr,
          booking_id: bookingId || undefined,
          guest_key: guestKey,
          day_no: dayNo,
          vehicle_allocation_id: vehicleAllocId,
          seat_number: seat,
        },
      },
      { new: true, upsert: true }
    ).lean();
    return res.status(200).json({ status: 'success', data: doc });
  } catch (error: any) {
    if (error?.code === 11000) return res.status(409).json({ status: 'fail', message: 'Trùng ghế hoặc guest đã được gán' });
    return res.status(500).json({ status: 'error', message: error.message || 'Lỗi khi gán ghế' });
  }
};

export const deleteTripVehicleAssignment = async (req: Request, res: Response) => {
  try {
    const tourId = String(req.params.id || '');
    const dateStr = normalizeTripDate(req.params.date);
    if (!tourId || !dateStr) return res.status(400).json({ status: 'fail', message: 'Thiếu tourId hoặc date' });
    const tripKey = tripKeyOf(tourId, dateStr);
    const guestKey = String(req.params.guestKey || '').trim();
    const dayNo = Math.max(1, Number(req.params.dayNo || 1));
    await VehicleAssignment.deleteOne({ trip_key: tripKey, guest_key: guestKey, day_no: dayNo });
    return res.status(200).json({ status: 'success' });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message || 'Lỗi khi xoá vehicle assignment' });
  }
};

export const getTripRoomAssignments = async (req: Request, res: Response) => {
  try {
    const tourId = String(req.params.id || '');
    const dateStr = normalizeTripDate(req.params.date);
    if (!tourId || !dateStr) return res.status(400).json({ status: 'fail', message: 'Thiếu tourId hoặc date' });
    const tripKey = tripKeyOf(tourId, dateStr);
    const rows = await RoomAssignment.find({ trip_key: tripKey }).sort({ day_no: 1, guest_key: 1 }).lean();
    return res.status(200).json({ status: 'success', data: rows });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message || 'Lỗi khi lấy room assignments' });
  }
};

export const upsertTripRoomAssignment = async (req: Request, res: Response) => {
  try {
    const tourId = String(req.params.id || '');
    const dateStr = normalizeTripDate(req.params.date);
    if (!tourId || !dateStr) return res.status(400).json({ status: 'fail', message: 'Thiếu tourId hoặc date' });
    const tripKey = tripKeyOf(tourId, dateStr);
    const { guest_key, day_no, room_allocation_id, slot_no } = req.body || {};
    const guestKey = String(guest_key || '').trim();
    const dayNo = Math.max(1, Number(day_no || 1));
    const roomAllocId = String(room_allocation_id || '').trim();
    const slotNo = Math.max(1, Number(slot_no || 1));
    if (!guestKey || !roomAllocId) return res.status(400).json({ status: 'fail', message: 'Thiếu guest_key / room_allocation_id' });
    const alloc: any = await RoomAllocation.findOne({ _id: roomAllocId, trip_key: tripKey, day_no: dayNo }).lean();
    if (!alloc) return res.status(400).json({ status: 'fail', message: 'Room allocation không hợp lệ' });
    const maxOcc = Math.max(1, Number(alloc?.max_occupancy || 1));
    if (slotNo > maxOcc) return res.status(400).json({ status: 'fail', message: `slot_no vượt sức chứa phòng (${maxOcc})` });
    const [bookingId] = guestKey.split(':');
    const doc = await RoomAssignment.findOneAndUpdate(
      { trip_key: tripKey, day_no: dayNo, guest_key: guestKey },
      {
        $set: {
          trip_key: tripKey,
          tour_id: tourId,
          trip_date: dateStr,
          booking_id: bookingId || undefined,
          guest_key: guestKey,
          day_no: dayNo,
          room_allocation_id: roomAllocId,
          slot_no: slotNo,
        },
      },
      { new: true, upsert: true }
    ).lean();
    return res.status(200).json({ status: 'success', data: doc });
  } catch (error: any) {
    if (error?.code === 11000) return res.status(409).json({ status: 'fail', message: 'Trùng slot hoặc guest đã được gán' });
    return res.status(500).json({ status: 'error', message: error.message || 'Lỗi khi gán phòng' });
  }
};

export const deleteTripRoomAssignment = async (req: Request, res: Response) => {
  try {
    const tourId = String(req.params.id || '');
    const dateStr = normalizeTripDate(req.params.date);
    if (!tourId || !dateStr) return res.status(400).json({ status: 'fail', message: 'Thiếu tourId hoặc date' });
    const tripKey = tripKeyOf(tourId, dateStr);
    const guestKey = String(req.params.guestKey || '').trim();
    const dayNo = Math.max(1, Number(req.params.dayNo || 1));
    await RoomAssignment.deleteOne({ trip_key: tripKey, guest_key: guestKey, day_no: dayNo });
    return res.status(200).json({ status: 'success' });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message || 'Lỗi khi xoá room assignment' });
  }
};

export const getTripPassengers = async (req: Request, res: Response) => {
  try {
    const tourId = String(req.params.id || '');
    const dateStr = normalizeTripDate(req.params.date);
    if (!tourId || !dateStr) return res.status(400).json({ status: 'fail', message: 'Thiếu tourId hoặc date' });
    const tripKey = tripKeyOf(tourId, dateStr);
    const rows = await Passenger.find({ trip_key: tripKey, role: { $ne: 'leader' } })
      .sort({ is_leader: -1, full_name: 1 })
      .lean();
    return res.status(200).json({ status: 'success', data: rows });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message || 'Lỗi khi lấy passengers' });
  }
};

export const getTripVehicles = async (req: Request, res: Response) => {
  try {
    const tourId = String(req.params.id || '');
    const dateStr = normalizeTripDate(req.params.date);
    if (!tourId || !dateStr) return res.status(400).json({ status: 'fail', message: 'Thiếu tourId hoặc date' });
    const tripKey = tripKeyOf(tourId, dateStr);
    const rows = await TripVehicle.find({ trip_key: tripKey }).sort({ created_at: 1 }).lean();
    return res.status(200).json({ status: 'success', data: rows });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message || 'Lỗi khi lấy trip vehicles' });
  }
};

export const addTripVehicle = async (req: Request, res: Response) => {
  try {
    const tourId = String(req.params.id || '');
    const dateStr = normalizeTripDate(req.params.date);
    if (!tourId || !dateStr) return res.status(400).json({ status: 'fail', message: 'Thiếu tourId hoặc date' });
    const tripKey = tripKeyOf(tourId, dateStr);
    const vehicleId = String(req.body?.vehicle_id || '').trim();
    const seatCountRaw = Math.max(1, Number(req.body?.seat_count || 45));
    if (!vehicleId) return res.status(400).json({ status: 'fail', message: 'Thiếu vehicle_id' });
    const vehicle: any = await Vehicle.findById(vehicleId).lean();
    if (!vehicle) return res.status(404).json({ status: 'fail', message: 'Không tìm thấy xe' });
    const cap = Math.max(1, Number(vehicle?.capacity || 1));
    if (seatCountRaw > cap) {
      return res.status(400).json({
        status: 'fail',
        message: `Số ghế của trip (${seatCountRaw}) không được vượt quá sức chứa xe (${cap}).`,
      });
    }
    const seatCount = seatCountRaw;

    const created = await TripVehicle.create({
      tour_id: tourId,
      trip_key: tripKey,
      trip_date: dateStr,
      vehicle_id: vehicleId,
      plate: vehicle.plate,
      seat_count: seatCount,
    });
    return res.status(201).json({ status: 'success', data: created });
  } catch (error: any) {
    if (error?.code === 11000) return res.status(409).json({ status: 'fail', message: 'Xe đã tồn tại trong trip' });
    return res.status(500).json({ status: 'error', message: error.message || 'Lỗi khi thêm xe vào trip' });
  }
};

export const getTripSeatingState = async (req: Request, res: Response) => {
  try {
    const tourId = String(req.params.id || '');
    const dateStr = normalizeTripDate(req.params.date);
    if (!tourId || !dateStr) return res.status(400).json({ status: 'fail', message: 'Thiếu tourId hoặc date' });
    const tripKey = tripKeyOf(tourId, dateStr);

    const vehicles = await TripVehicle.find({ trip_key: tripKey }).sort({ created_at: 1 }).lean();
    const passengers = await Passenger.find({ trip_key: tripKey, role: { $ne: 'leader' } })
      .sort({ is_leader: -1, full_name: 1 })
      .lean();
    const allocations = await SeatingAllocation.find({ trip_key: tripKey }).lean();

    const seatByPassenger = new Map<string, any>();
    const seatByCode = new Map<string, any>(); // `${tripVehicleId}:${seat_code}`
    for (const a of allocations) {
      seatByPassenger.set(String(a.passenger_id), a);
      seatByCode.set(`${String(a.trip_vehicle_id)}:${String(a.seat_code)}`, a);
    }

    const seatedPassengerIds = new Set<string>(allocations.map((a: any) => String(a.passenger_id)));
    const unseated = passengers.filter((p: any) => !seatedPassengerIds.has(String(p._id)));

    return res.status(200).json({
      status: 'success',
      data: {
        vehicles,
        passengers,
        unseated,
        allocations,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message || 'Lỗi khi lấy seating state' });
  }
};

export const assignSeat = async (req: Request, res: Response) => {
  try {
    const tourId = String(req.params.id || '');
    const dateStr = normalizeTripDate(req.params.date);
    if (!tourId || !dateStr) return res.status(400).json({ status: 'fail', message: 'Thiếu tourId hoặc date' });
    const tripKey = tripKeyOf(tourId, dateStr);

    const tripVehicleId = String(req.body?.trip_vehicle_id || '').trim();
    const passengerId = String(req.body?.passenger_id || '').trim();
    const seatCode = String(req.body?.seat_code || '').trim();
    if (!tripVehicleId || !passengerId || !seatCode) {
      return res.status(400).json({ status: 'fail', message: 'Thiếu trip_vehicle_id / passenger_id / seat_code' });
    }

    const tv: any = await TripVehicle.findOne({ _id: tripVehicleId, trip_key: tripKey }).lean();
    if (!tv) return res.status(400).json({ status: 'fail', message: 'TripVehicle không hợp lệ' });

    const p: any = await Passenger.findOne({ _id: passengerId, trip_key: tripKey }).lean();
    if (!p) return res.status(400).json({ status: 'fail', message: 'Passenger không thuộc trip này' });

    const doc = await SeatingAllocation.findOneAndUpdate(
      { trip_key: tripKey, passenger_id: passengerId },
      {
        $set: {
          tour_id: tourId,
          trip_key: tripKey,
          trip_date: dateStr,
          trip_vehicle_id: tripVehicleId,
          passenger_id: passengerId,
          seat_code: seatCode,
        },
      },
      { new: true, upsert: true }
    ).lean();

    return res.status(200).json({ status: 'success', data: doc });
  } catch (error: any) {
    if (error?.code === 11000) {
      return res.status(409).json({ status: 'fail', message: 'Ghế đã có người hoặc passenger đã có ghế' });
    }
    return res.status(500).json({ status: 'error', message: error.message || 'Lỗi khi gán ghế' });
  }
};

export const unassignSeat = async (req: Request, res: Response) => {
  try {
    const tourId = String(req.params.id || '');
    const dateStr = normalizeTripDate(req.params.date);
    if (!tourId || !dateStr) return res.status(400).json({ status: 'fail', message: 'Thiếu tourId hoặc date' });
    const tripKey = tripKeyOf(tourId, dateStr);
    const passengerId = String(req.params.passengerId || '').trim();
    await SeatingAllocation.deleteOne({ trip_key: tripKey, passenger_id: passengerId });
    return res.status(200).json({ status: 'success' });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message || 'Lỗi khi gỡ ghế' });
  }
};

export const getTripRooms = async (req: Request, res: Response) => {
  try {
    const tourId = String(req.params.id || '');
    const dateStr = normalizeTripDate(req.params.date);
    if (!tourId || !dateStr) return res.status(400).json({ status: 'fail', message: 'Thiếu tourId hoặc date' });
    const tripKey = tripKeyOf(tourId, dateStr);
    const rows = await TripRoom.find({ trip_key: tripKey }).sort({ hotel_name: 1, room_number: 1 }).lean();
    return res.status(200).json({ status: 'success', data: rows });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message || 'Lỗi khi lấy trip rooms' });
  }
};

export const addTripRoom = async (req: Request, res: Response) => {
  try {
    const tourId = String(req.params.id || '');
    const dateStr = normalizeTripDate(req.params.date);
    if (!tourId || !dateStr) return res.status(400).json({ status: 'fail', message: 'Thiếu tourId hoặc date' });
    const tripKey = tripKeyOf(tourId, dateStr);
    const roomId = String(req.body?.room_id || '').trim();
    const capacityRaw = req.body?.capacity;
    if (!roomId) return res.status(400).json({ status: 'fail', message: 'Thiếu room_id' });

    const room: any = await Room.findById(roomId).populate('hotel_id', 'name').lean();
    if (!room) return res.status(404).json({ status: 'fail', message: 'Không tìm thấy phòng' });

    const maxOcc = Math.max(1, Number(room?.max_occupancy || 1));
    const cap = capacityRaw === undefined ? maxOcc : Math.max(1, Number(capacityRaw || 1));
    if (cap > maxOcc) {
      return res.status(400).json({
        status: 'fail',
        message: `Sức chứa phòng trong trip (${cap}) không được vượt quá sức chứa phòng gốc (${maxOcc}).`,
      });
    }

    const created = await TripRoom.create({
      tour_id: tourId,
      trip_key: tripKey,
      trip_date: dateStr,
      room_id: roomId,
      hotel_id: room?.hotel_id?._id || room?.hotel_id,
      hotel_name: room?.hotel_id?.name || room?.hotel_name || '',
      room_number: String(room?.room_number || '').trim() || '—',
      capacity: cap,
    });

    return res.status(201).json({ status: 'success', data: created });
  } catch (error: any) {
    if (error?.code === 11000) return res.status(409).json({ status: 'fail', message: 'Phòng đã tồn tại trong trip' });
    return res.status(500).json({ status: 'error', message: error.message || 'Lỗi khi thêm phòng vào trip' });
  }
};

export const deleteTripRoom = async (req: Request, res: Response) => {
  try {
    const tourId = String(req.params.id || '');
    const dateStr = normalizeTripDate(req.params.date);
    const tripRoomId = String(req.params.tripRoomId || '').trim();
    if (!tourId || !dateStr || !tripRoomId) {
      return res.status(400).json({ status: 'fail', message: 'Thiếu tourId, date hoặc tripRoomId' });
    }
    const tripKey = tripKeyOf(tourId, dateStr);

    const room = await TripRoom.findOne({ _id: tripRoomId, trip_key: tripKey }).lean();
    if (!room) {
      return res.status(404).json({ status: 'fail', message: 'Không tìm thấy phòng trong trip' });
    }

    const allocated = await RoomingAllocation.countDocuments({ trip_key: tripKey, trip_room_id: tripRoomId });
    if (allocated > 0) {
      return res.status(409).json({
        status: 'fail',
        message: 'Phòng đang có khách. Vui lòng gỡ toàn bộ khách khỏi phòng trước khi xóa.',
      });
    }

    await TripRoom.deleteOne({ _id: tripRoomId, trip_key: tripKey });
    return res.status(200).json({ status: 'success' });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message || 'Lỗi khi xóa phòng khỏi trip' });
  }
};

export const bulkAddTripRoomsByHotel = async (req: Request, res: Response) => {
  try {
    const tourId = String(req.params.id || '');
    const dateStr = normalizeTripDate(req.params.date);
    if (!tourId || !dateStr) return res.status(400).json({ status: 'fail', message: 'Thiếu tourId hoặc date' });
    const tripKey = tripKeyOf(tourId, dateStr);

    const hotelId = String(req.body?.hotel_id || '').trim();
    if (!hotelId) return res.status(400).json({ status: 'fail', message: 'Thiếu hotel_id' });

    const rooms = await Room.find({ hotel_id: hotelId, status: 'active' })
      .populate('hotel_id', 'name')
      .sort({ room_number: 1 })
      .lean();
    if (!rooms.length) {
      return res.status(200).json({ status: 'success', data: { inserted: 0, skipped: 0, message: 'Khách sạn chưa có phòng active' } });
    }

    const docs = rooms.map((room: any) => {
      const maxOcc = Math.max(1, Number(room?.max_occupancy || 1));
      return {
        tour_id: tourId,
        trip_key: tripKey,
        trip_date: dateStr,
        room_id: room._id,
        hotel_id: room?.hotel_id?._id || room?.hotel_id,
        hotel_name: room?.hotel_id?.name || '',
        room_number: String(room?.room_number || '').trim() || '—',
        capacity: maxOcc,
      };
    });

    let inserted = 0;
    let skipped = 0;
    try {
      const result = await TripRoom.insertMany(docs, { ordered: false });
      inserted = Array.isArray(result) ? result.length : 0;
    } catch (e: any) {
      const writeErrors = Array.isArray(e?.writeErrors) ? e.writeErrors : [];
      // nhiều lỗi là duplicate key 
      skipped = writeErrors.length;
      inserted = Math.max(0, docs.length - skipped);
    }

    return res.status(201).json({ status: 'success', data: { inserted, skipped } });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message || 'Lỗi khi thêm phòng theo khách sạn' });
  }
};

export const getTripRoomingState = async (req: Request, res: Response) => {
  try {
    const tourId = String(req.params.id || '');
    const dateStr = normalizeTripDate(req.params.date);
    if (!tourId || !dateStr) return res.status(400).json({ status: 'fail', message: 'Thiếu tourId hoặc date' });
    const tripKey = tripKeyOf(tourId, dateStr);

    const rooms = await TripRoom.find({ trip_key: tripKey }).sort({ hotel_name: 1, room_number: 1 }).lean();
    const passengers = await Passenger.find({ trip_key: tripKey, role: { $ne: 'leader' } })
      .sort({ is_leader: -1, full_name: 1 })
      .lean();
    const allocations = await RoomingAllocation.find({ trip_key: tripKey }).lean();

    const assignedPassengerIds = new Set<string>(allocations.map((a: any) => String(a.passenger_id)));
    const unassigned = passengers.filter((p: any) => !assignedPassengerIds.has(String(p._id)));

    // Group unassigned passengers by booking_id for UI accordion
    const bookingIds = Array.from(
      new Set(unassigned.map((p: any) => String(p?.booking_id || '')).filter((x: string) => x))
    );
    const bookings = bookingIds.length
      ? await Booking.find({ _id: { $in: bookingIds } })
          .select('customer_name customer_phone customer_note groupSize single_room_request_count')
          .lean()
      : [];
    const bookingMap = new Map<string, any>(bookings.map((b: any) => [String(b._id), b]));

    const grouped: Array<{
      booking_id: string;
      booking_code: string;
      customer_name?: string;
      customer_phone?: string;
      note?: string;
      groupSize?: number;
      passengers: any[];
    }> = [];

    const bucket = new Map<string, any[]>();
    for (const p of unassigned) {
      const bid = String((p as any)?.booking_id || '');
      if (!bid) continue;
      const arr = bucket.get(bid) || [];
      arr.push(p);
      bucket.set(bid, arr);
    }
    for (const [bid, ps] of bucket.entries()) {
      const b = bookingMap.get(bid);
      grouped.push({
        booking_id: bid,
        booking_code: String(bid).slice(-6).toUpperCase(),
        customer_name: b?.customer_name,
        customer_phone: b?.customer_phone,
        note: b?.customer_note,
        groupSize: b?.groupSize,
        single_room_request_count: Number((b as any)?.single_room_request_count || 0),
        passengers: ps,
      });
    }
    grouped.sort((a, b) => String(b.booking_id).localeCompare(String(a.booking_id)));

    return res.status(200).json({
      status: 'success',
      data: { rooms, passengers, unassigned, allocations, unassigned_by_booking: grouped },
    });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message || 'Lỗi khi lấy rooming state' });
  }
};

export const assignRoom = async (req: Request, res: Response) => {
  try {
    const tourId = String(req.params.id || '');
    const dateStr = normalizeTripDate(req.params.date);
    if (!tourId || !dateStr) return res.status(400).json({ status: 'fail', message: 'Thiếu tourId hoặc date' });
    const tripKey = tripKeyOf(tourId, dateStr);

    const tripRoomId = String(req.body?.trip_room_id || '').trim();
    const passengerId = String(req.body?.passenger_id || '').trim();
    if (!tripRoomId || !passengerId) {
      return res.status(400).json({ status: 'fail', message: 'Thiếu trip_room_id / passenger_id' });
    }

    const room: any = await TripRoom.findOne({ _id: tripRoomId, trip_key: tripKey }).lean();
    if (!room) return res.status(400).json({ status: 'fail', message: 'TripRoom không hợp lệ' });
    const passenger: any = await Passenger.findOne({ _id: passengerId, trip_key: tripKey }).lean();
    if (!passenger) return res.status(400).json({ status: 'fail', message: 'Passenger không thuộc trip này' });

    const currentCount = await RoomingAllocation.countDocuments({ trip_key: tripKey, trip_room_id: tripRoomId });
    const cap = Math.max(1, Number(room?.capacity || 1));
    if (currentCount >= cap) {
      return res.status(400).json({ status: 'fail', message: `Phòng đã đủ chỗ (${cap}).` });
    }

    const doc = await RoomingAllocation.findOneAndUpdate(
      { trip_key: tripKey, passenger_id: passengerId },
      {
        $set: {
          tour_id: tourId,
          trip_key: tripKey,
          trip_date: dateStr,
          trip_room_id: tripRoomId,
          passenger_id: passengerId,
        },
      },
      { new: true, upsert: true }
    ).lean();

    return res.status(200).json({ status: 'success', data: doc });
  } catch (error: any) {
    if (error?.code === 11000) return res.status(409).json({ status: 'fail', message: 'Khách đã có phòng hoặc trùng mapping' });
    return res.status(500).json({ status: 'error', message: error.message || 'Lỗi khi gán phòng' });
  }
};

export const unassignRoom = async (req: Request, res: Response) => {
  try {
    const tourId = String(req.params.id || '');
    const dateStr = normalizeTripDate(req.params.date);
    if (!tourId || !dateStr) return res.status(400).json({ status: 'fail', message: 'Thiếu tourId hoặc date' });
    const tripKey = tripKeyOf(tourId, dateStr);
    const passengerId = String(req.params.passengerId || '').trim();
    await RoomingAllocation.deleteOne({ trip_key: tripKey, passenger_id: passengerId });
    return res.status(200).json({ status: 'success' });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message || 'Lỗi khi gỡ phòng' });
  }
};

export const getTripAssignment = async (req: AuthRequest, res: Response) => {
  try {
    const tourId = String(req.params.id || '');
    const dateStr = normalizeTripDate(req.params.date);
    if (!tourId || !dateStr) return res.status(400).json({ status: 'fail', message: 'Thiếu tourId hoặc date' });
    const tripKey = tripKeyOf(tourId, dateStr);

    const tour: any = await Tour.findById(tourId).select('name primary_guide_id secondary_guide_ids duration_days').lean();
    if (!tour) return res.status(404).json({ status: 'fail', message: 'Không tìm thấy tour' });

    // guide info (primary). SĐT nằm trong bảng Guide (1-1 theo user_id).
    const primaryGuideId = tour?.primary_guide_id ? String(tour.primary_guide_id) : '';
    const guideDoc: any = primaryGuideId
      ? await Guide.findOne({ user_id: primaryGuideId }).select('name phone email avatar user_id').lean()
      : null;
    const guideUser: any = primaryGuideId ? await User.findById(primaryGuideId).select('name email avatar role').lean() : null;
    const guide = primaryGuideId
      ? {
          _id: primaryGuideId,
          name: guideDoc?.name || guideUser?.name || '',
          phone: guideDoc?.phone || (guideUser as any)?.phone || '',
          email: guideDoc?.email || guideUser?.email || '',
        }
      : null;

    const vehicles = await TripVehicle.find({ trip_key: tripKey }).sort({ created_at: 1 }).lean();
    const rooms = await TripRoom.find({ trip_key: tripKey }).sort({ hotel_name: 1, room_number: 1 }).lean();

    const passengers = await Passenger.find({ trip_key: tripKey, role: { $ne: 'leader' } })
      .sort({ is_leader: -1, full_name: 1 })
      .lean();
    const passengerById = new Map<string, any>(passengers.map((p: any) => [String(p._id), p]));

    const seating = await SeatingAllocation.find({ trip_key: tripKey }).lean();
    const rooming = await RoomingAllocation.find({ trip_key: tripKey }).lean();

    const seatingByPassenger = new Map<string, any>();
    seating.forEach((a: any) => seatingByPassenger.set(String(a.passenger_id), a));

    const vehicleById = new Map<string, any>(vehicles.map((v: any) => [String(v._id), v]));

    const occupantsByRoomId = new Map<string, any[]>();
    rooming.forEach((a: any) => {
      const rid = String(a.trip_room_id || '');
      const pid = String(a.passenger_id || '');
      const p = passengerById.get(pid);
      if (!rid || !p) return;
      const arr = occupantsByRoomId.get(rid) || [];
      arr.push(p);
      occupantsByRoomId.set(rid, arr);
    });

    const hotelIds = Array.from(new Set(rooms.map((r: any) => String(r?.hotel_id || '')).filter(Boolean)));
    const hotels = hotelIds.length ? await Hotel.find({ _id: { $in: hotelIds } }).select('name address').lean() : [];
    const hotelMap = new Map<string, any>(hotels.map((h: any) => [String(h._id), h]));

    const roomingList = rooms.map((r: any) => {
      const occ = occupantsByRoomId.get(String(r._id)) || [];
      const h = r?.hotel_id ? hotelMap.get(String(r.hotel_id)) : null;
      return {
        trip_room_id: r._id,
        hotel_id: r?.hotel_id,
        hotel_name: r?.hotel_name || h?.name || '',
        hotel_address: h?.address || '',
        room_number: r?.room_number,
        capacity: r?.capacity,
        occupants: occ.map((p: any) => ({
          _id: p._id,
          booking_id: p.booking_id,
          full_name: p.full_name,
          phone: p.phone,
          is_leader: Boolean(p.is_leader),
        })),
      };
    });

    const passengerList = passengers.map((p: any) => {
      const seat = seatingByPassenger.get(String(p._id));
      const tv = seat ? vehicleById.get(String(seat.trip_vehicle_id)) : null;
      const roomAlloc = rooming.find((a: any) => String(a.passenger_id) === String(p._id));
      const roomDoc = roomAlloc ? rooms.find((rr: any) => String(rr._id) === String(roomAlloc.trip_room_id)) : null;
      const h = roomDoc?.hotel_id ? hotelMap.get(String(roomDoc.hotel_id)) : null;
      return {
        _id: p._id,
        booking_id: p.booking_id,
        full_name: p.full_name,
        phone: p.phone,
        is_leader: Boolean(p.is_leader),
        seat: seat
          ? { seat_code: seat.seat_code, plate: tv?.plate || '', vehicle_label: tv?.seat_count ? `Ô tô ${tv.seat_count} chỗ` : '' }
          : null,
        room: roomDoc
          ? {
              room_number: roomDoc.room_number,
              hotel_name: roomDoc.hotel_name || h?.name || '',
              hotel_address: h?.address || '',
            }
          : null,
      };
    });

    const unpaid_booking_count = await Booking.countDocuments({
      tour_id: tourId,
      status: { $ne: 'cancelled' },
      startDate: {
        $gte: new Date(`${dateStr}T00:00:00.000Z`),
        $lte: new Date(`${dateStr}T23:59:59.999Z`),
      },
      $or: [{ payment_status: { $exists: false } }, { payment_status: { $ne: 'paid' } }],
    });

    return res.status(200).json({
      status: 'success',
      data: {
        trip: { tour_id: tourId, trip_date: dateStr, trip_key: tripKey, tour_name: tour?.name || '' },
        guide,
        vehicles: vehicles.map((v: any) => ({
          _id: v._id,
          plate: v?.plate || '',
          seat_count: v?.seat_count || 0,
          vehicle_label: v?.seat_count ? `Ô tô ${v.seat_count} chỗ` : '',
        })),
        hotels: Array.from(
          new Map(
            roomingList
              .filter((x: any) => x.hotel_name || x.hotel_id)
              .map((x: any) => [
                String(x.hotel_id || x.hotel_name),
                { hotel_id: x.hotel_id || undefined, name: x.hotel_name || '', address: x.hotel_address || '' },
              ])
          ).values()
        ),
        rooming_list: roomingList,
        passengers: passengerList,
        unpaid_booking_count,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message || 'Lỗi khi lấy lệnh điều động' });
  }
};

export const getAllTours = async (req: Request, res: Response) => {
  try {
    
    const {
      page = '1',
      limit = '12',
      status,
      search,
      category_id,
      minPrice,
      maxPrice,
      departureDate,
    } = req.query as Record<string, string | undefined>;

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 12);
    const skip = (pageNum - 1) * limitNum;

    const isAdmin = (req as AuthRequest).user?.role === 'admin';

    const escapeRegExp = (value: string) =>
      value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const filter: Record<string, any> = {};
    // Khách & API công khai: chỉ thấy tour có ít nhất 1 trip OPENING.
    // Admin: không filter theo tour.status nữa (status tour cũ sẽ bị ẩn ở UI).
    if (!isAdmin) {
      const openTrips = await TourTrip.find({ status: 'OPENING' }).select('tour_id').lean();
      const tourIds = [...new Set(openTrips.map((t: any) => String(t?.tour_id || '')).filter(Boolean))];
      if (tourIds.length === 0) {
        return res.status(200).json({
          status: 'success',
          results: 0,
          total: 0,
          page: pageNum,
          limit: limitNum,
          data: [],
        });
      }
      filter._id = { $in: tourIds };
    }
    if (category_id && category_id.trim() !== '') {
      filter.category_id = category_id;
    }

    if (minPrice || maxPrice) {
      const priceFilter: Record<string, any> = {};
      if (minPrice && !Number.isNaN(Number(minPrice))) {
        priceFilter.$gte = Number(minPrice);
      }
      if (maxPrice && !Number.isNaN(Number(maxPrice))) {
        priceFilter.$lte = Number(maxPrice);
      }
      if (Object.keys(priceFilter).length > 0) {
        filter.price = priceFilter;
      }
    }

    if (departureDate && departureDate.trim() !== '') {
      // departure_schedule.date đang lưu dạng string "YYYY-MM-DD"
      filter['departure_schedule.date'] = departureDate.trim();
    }

    if (search && search.trim() !== '') {
      const q = escapeRegExp(search.trim());
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { 'schedule.title': { $regex: q, $options: 'i' } },
      ];
    }

    const total = await Tour.countDocuments(filter);

    // .populate('category_id') để lấy luôn thông tin danh mục thay vì chỉ hiện ID
    const tours = await Tour.find(filter)
      .populate('category_id')
      .populate({ path: 'primary_guide_id', select: 'name email phone role' })
      .populate({ path: 'secondary_guide_ids', select: 'name email phone role' })
      .populate({ path: 'schedule.lunch_restaurant_id', select: 'name location phone' })
      .populate({ path: 'schedule.dinner_restaurant_id', select: 'name location phone' })
      .populate({
        path: 'schedule.ticket_ids',
        select: 'name ticket_type application_mode price_adult price_child status',
      })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limitNum);

    const data = !isAdmin ? await filterTourSchedulesToOpeningTripsOnly(tours) : tours.map((t: any) => (typeof t.toObject === 'function' ? t.toObject() : t));

    res.status(200).json({
      status: 'success',
      results: total,
      total,
      page: pageNum,
      limit: limitNum,
      data,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

//  Lấy chi tiết 1 Tour
export const getTour = async (req: Request, res: Response) => {
  try {
    const tour = await Tour.findById(req.params.id)
      .populate('category_id')
      .populate({ path: 'primary_guide_id', select: 'name email phone role' })
      .populate({ path: 'secondary_guide_ids', select: 'name email phone role' })
      .populate({ path: 'schedule.lunch_restaurant_id', select: 'name location phone capacity' })
      .populate({ path: 'schedule.dinner_restaurant_id', select: 'name location phone capacity' })
      .populate({
        path: 'schedule.ticket_ids',
        select: 'name ticket_type application_mode price_adult price_child status',
      });
    if (!tour) return res.status(404).json({ message: 'Không tìm thấy tour' });

    const isAdmin = (req as AuthRequest).user?.role === 'admin';
    if (!isAdmin) {
      const hasOpeningTrip = await TourTrip.exists({ tour_id: tour._id, status: 'OPENING' });
      if (!hasOpeningTrip) return res.status(404).json({ message: 'Không tìm thấy tour' });
      const narrowed = await filterTourSchedulesToOpeningTripsOnly([tour]);
      if (!narrowed.length) return res.status(404).json({ message: 'Không tìm thấy tour' });
      return res.status(200).json({
        status: 'success',
        data: narrowed[0],
      });
    }

    res.status(200).json({
      status: 'success',
      data: tour,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 3. CREATE: Thêm Tour mới
export const createTour = async (req: Request, res: Response) => {
  try {

    console.log("BODY CREATE:", JSON.stringify(req.body, null, 2));

    const payload: any = { ...req.body };

    // validate template tồn tại 
    if (payload.template_id) {
      const tpl = await TourTemplate.findById(payload.template_id);
      if (!tpl) {
        return res.status(400).json({ status: 'fail', message: 'Template không tồn tại' });
      }
      if (!payload.primary_guide_id) {
        return res.status(400).json({
          status: 'fail',
          message: 'Tạo tour từ template bắt buộc chọn HDV chính cho trip.',
        });
      }
    }

    if (payload.primary_guide_id && Array.isArray(payload.secondary_guide_ids)) {
      const p = String(payload.primary_guide_id);
      payload.secondary_guide_ids = [...new Set(payload.secondary_guide_ids.map((x: any) => String(x)))].filter(
        (id) => id && id !== p
      );
    }

    // validate giá > 0
    if (payload.price === undefined || Number(payload.price) <= 0) {
      return res.status(400).json({ status: 'fail', message: 'Giá tour phải lớn hơn 0' });
    }

    // validate ngày hợp lệ + không trùng + slots > 
    const ds = Array.isArray(payload.departure_schedule) ? payload.departure_schedule : [];
    if (!ds.length || !ds[0]?.date) {
      return res.status(400).json({ status: 'fail', message: 'Thiếu ngày khởi hành' });
    }
    const dateStr = normalizeDateStr(ds[0].date);
    const slots = Number(ds[0].slots || 0);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return res.status(400).json({ status: 'fail', message: 'Ngày khởi hành không hợp lệ (YYYY-MM-DD)' });
    }
    const departureDate = parseYyyyMmDd(dateStr);
    if (!departureDate) {
      return res.status(400).json({ status: 'fail', message: 'Ngày khởi hành không hợp lệ' });
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (departureDate.getTime() < today.getTime()) {
      return res.status(400).json({ status: 'fail', message: 'Ngày khởi hành phải từ hôm nay trở đi.' });
    }
    if (slots <= 0) {
      return res.status(400).json({ status: 'fail', message: 'Số chỗ phải lớn hơn 0' });
    }

    const guideIds: string[] = [];
    if (payload.primary_guide_id) guideIds.push(String(payload.primary_guide_id));
    if (Array.isArray(payload.secondary_guide_ids)) {
      payload.secondary_guide_ids.forEach((id: any) => {
        if (id) guideIds.push(String(id));
      });
    }

    const uniqueGuideIds = [...new Set(guideIds)].filter(Boolean);
    if (uniqueGuideIds.length > 0) {
      const conflictTours = await Tour.find({
        $or: [
          { primary_guide_id: { $in: uniqueGuideIds } },
          { secondary_guide_ids: { $in: uniqueGuideIds } },
        ],
      }).select('name departure_schedule duration_days primary_guide_id secondary_guide_ids').lean();

      const durationDays = Math.max(1, Number(payload.duration_days || 1));
      const requestedEndDate = addDays(departureDate, durationDays - 1);
      const conflictMessages: string[] = [];

      for (const tour of conflictTours) {
        const tourDuration = Math.max(1, Number(tour.duration_days || 1));
        const schedules = Array.isArray((tour as any).departure_schedule) ? (tour as any).departure_schedule : [];
        for (const item of schedules) {
          const existingDate = normalizeDateStr(item?.date);
          const existingStart = parseYyyyMmDd(existingDate);
          if (!existingStart) continue;
          const existingEnd = addDays(existingStart, tourDuration - 1);
          if (rangesOverlap(departureDate, requestedEndDate, existingStart, existingEnd)) {
            conflictMessages.push(`${tour.name || 'Tour không rõ'} (${existingDate})`);
            break;
          }
        }
      }

      if (conflictMessages.length > 0) {
        return res.status(400).json({
          status: 'fail',
          message: `HDV đã được xếp lịch trùng với tour khác: ${[...new Set(conflictMessages)].join(', ')}. Vui lòng chọn ngày khác hoặc HDV khác.`,
        });
      }
    }

    if (payload.name) {
      const existed = await Tour.findOne({
        name: String(payload.name).trim(),
        'departure_schedule.date': dateStr,
      });
      if (existed) {
        return res.status(400).json({
          status: 'fail',
          message: 'Tour đã tồn tại với ngày khởi hành này. Vui lòng chọn ngày khác.',
        });
      }
    }

    const newTour = await Tour.create(payload);

    // tạo TourTrip mặc định DRAFT cho lịch khởi hành
    const tourId = String((newTour as any)?._id || '');
    if (tourId && dateStr) {
      const trip_key = tripKeyOf(tourId, dateStr);
      await TourTrip.findOneAndUpdate(
        { trip_key },
        { $setOnInsert: { tour_id: tourId, trip_key, trip_date: dateStr, status: 'DRAFT' as TripStatus } },
        { upsert: true, new: true }
      );
    }

    res.status(201).json({
      status: 'success',
      data: newTour
    });
  } catch (error: any) {
    res.status(400).json({ 
      status: 'fail',
      message: error.message 
    });
  }
};

export const getAvailableGuidesForTrip = async (req: Request, res: Response) => {
  try {
    const dateStr = normalizeTripDate(req.query.date);
    const duration = Math.max(1, Number(req.query.duration || 1));
    if (!dateStr) {
      return res.status(400).json({ status: 'fail', message: 'Thiếu ngày khởi hành (YYYY-MM-DD)' });
    }
    if (duration <= 0) {
      return res.status(400).json({ status: 'fail', message: 'Duration phải lớn hơn 0' });
    }
    const startDate = parseYyyyMmDd(dateStr);
    if (!startDate) {
      return res.status(400).json({ status: 'fail', message: 'Ngày khởi hành không hợp lệ' });
    }
    const endDate = addDays(startDate, duration - 1);

    const tours = await Tour.find({
      $or: [
        { primary_guide_id: { $exists: true, $ne: null } },
        { secondary_guide_ids: { $exists: true, $ne: [] } },
      ],
    })
      .select('primary_guide_id secondary_guide_ids departure_schedule duration_days')
      .lean();

    const busyGuideIds = new Set<string>();
    for (const tour of tours) {
      const tourDuration = Math.max(1, Number((tour as any).duration_days || 1));
      const schedules = Array.isArray((tour as any).departure_schedule) ? (tour as any).departure_schedule : [];
      for (const item of schedules) {
        const existingDate = normalizeTripDate(item?.date);
        const existingStart = parseYyyyMmDd(existingDate);
        if (!existingStart) continue;
        const existingEnd = addDays(existingStart, tourDuration - 1);
        if (rangesOverlap(startDate, endDate, existingStart, existingEnd)) {
          if ((tour as any).primary_guide_id) {
            busyGuideIds.add(String((tour as any).primary_guide_id));
          }
          if (Array.isArray((tour as any).secondary_guide_ids)) {
            for (const id of (tour as any).secondary_guide_ids) {
              if (id) busyGuideIds.add(String(id));
            }
          }
          break;
        }
      }
    }

    const users = await User.find({ status: 'active', role: { $in: ['guide', 'hdv'] } })
      .select('-password')
      .lean();
    const available = users.filter((u: any) => !busyGuideIds.has(String(u._id)));

    res.status(200).json({ status: 'success', data: available });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// 4. UPDATE: Sửa Tour
export const updateTour = async (req: Request, res: Response) => {
  try {
    console.log("BODY UPDATE:", JSON.stringify(req.body, null, 2));
    const tour = await Tour.findById(req.params.id);

    if (!tour) {
      return res.status(404).json({ message: 'Không tìm thấy tour' });
      
    }


    // Rule mới:
    // - chỉ cho sửa: price, departure_schedule
    // - nếu tour đang chạy (CLOSED) hoặc đã kết thúc (COMPLETED) thì KHÓA luôn departure_schedule + slots
    const incomingKeys = Object.keys(req.body || {}).filter((k) => req.body?.[k] !== undefined);
    const hasRunningTrip = await TourTrip.exists({
      tour_id: tour._id,
      status: { $in: ['CLOSED', 'COMPLETED'] },
    });
    const allowedKeys = new Set<string>(['price', 'prices', 'departure_schedule']);
    if (hasRunningTrip) allowedKeys.delete('departure_schedule');
    const invalid = incomingKeys.filter((k) => !allowedKeys.has(k));
    if (invalid.length > 0) {
      return res.status(409).json({
        status: 'fail',
        message: hasRunningTrip
          ? `Tour đang chạy/đã kết thúc, chỉ được cập nhật: price. Trường không hợp lệ: ${invalid.join(', ')}`
          : `Chỉ được cập nhật: price, departure_schedule. Trường không hợp lệ: ${invalid.join(', ')}`,
      });
    }

    // validate template tồn tại (nếu có)
    if (req.body?.template_id) {
      const tpl = await TourTemplate.findById(req.body.template_id);
      if (!tpl) return res.status(400).json({ status: 'fail', message: 'Template không tồn tại' });
    }

    // validate giá > 0 (nếu update price)
    if (req.body?.price !== undefined && Number(req.body.price) <= 0) {
      return res.status(400).json({ status: 'fail', message: 'Giá tour phải lớn hơn 0' });
    }

    // validate giá chi tiết (prices) nếu có
    if (req.body?.prices !== undefined) {
      const arr = Array.isArray(req.body.prices) ? req.body.prices : [];
      const normalizedPrices = arr
        .map((p: any) => ({ name: String(p?.name || '').trim(), price: Number(p?.price || 0) }))
        .filter((p: any) => p.name);
      if (normalizedPrices.length === 0) {
        return res.status(400).json({ status: 'fail', message: 'Bảng giá chi tiết (prices) không hợp lệ' });
      }
      for (const p of normalizedPrices) {
        if (!Number.isFinite(p.price) || p.price < 0) {
          return res.status(400).json({ status: 'fail', message: 'Giá trong bảng giá chi tiết phải >= 0' });
        }
      }
      (tour as any).prices = normalizedPrices;
    }

    // validate & cập nhật lịch khởi hành (nhiều ngày)
    if (req.body?.departure_schedule !== undefined) {
      const ds = Array.isArray(req.body.departure_schedule) ? req.body.departure_schedule : [];
      if (!ds.length) {
        return res.status(400).json({ status: 'fail', message: 'Thiếu ngày khởi hành' });
      }

      const normalized = ds
        .map((x: any) => ({
          date: normalizeDateStr(x?.date),
          slots: Number(x?.slots || 0),
        }))
        .filter((x: any) => x.date);

      if (!normalized.length) {
        return res.status(400).json({ status: 'fail', message: 'Thiếu ngày khởi hành' });
      }

      for (const item of normalized) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
          return res.status(400).json({ status: 'fail', message: 'Ngày khởi hành không hợp lệ (YYYY-MM-DD)' });
        }
        if (!Number.isFinite(item.slots) || item.slots <= 0) {
          return res.status(400).json({ status: 'fail', message: 'Số chỗ phải lớn hơn 0' });
        }
      }

      // check trùng ngày trong cùng payload
      const dateSet = new Set<string>();
      for (const item of normalized) {
        if (dateSet.has(item.date)) {
          return res.status(400).json({ status: 'fail', message: `Ngày khởi hành bị trùng trong danh sách: ${item.date}` });
        }
        dateSet.add(item.date);
      }

      // check trùng ngày với instance khác (cùng tên tour)
      const dates = Array.from(dateSet);
      const existed = await Tour.findOne({
        _id: { $ne: tour._id },
        name: tour.name,
        'departure_schedule.date': { $in: dates },
      });
      if (existed) {
        return res.status(400).json({ status: 'fail', message: 'Có ngày khởi hành bị trùng với instance khác' });
      }

      // upsert TourTrip DRAFT cho các ngày mới (nếu chưa có)
      const tourId = String((tour as any)?._id || '');
      if (tourId) {
        await Promise.all(
          normalized.map(async (item: any) => {
            const trip_key = tripKeyOf(tourId, item.date);
            await TourTrip.findOneAndUpdate(
              { trip_key },
              { $setOnInsert: { tour_id: tourId, trip_key, trip_date: item.date, status: 'DRAFT' as TripStatus } },
              { upsert: true, new: true }
            );
          })
        );
      }

      (tour as any).departure_schedule = normalized;
    }
    if (req.body?.price !== undefined) (tour as any).price = Number(req.body.price);

    await tour.save(); // đảm bảo slug unique chạy khi name đổi

    res.status(200).json({
      status: 'success',
      data: tour
    });

  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
  
};

// 5. DELETE: Xóa Tour
export const deleteTour = async (req: Request, res: Response) => {
  try {
    const hasBooking = await Booking.exists({ tour_id: req.params.id, status: { $ne: 'cancelled' } });
    if (hasBooking) {
      return res.status(409).json({ status: 'fail', message: 'Tour đã có booking, không thể xoá' });
    }
    await Tour.findByIdAndDelete(req.params.id);
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};