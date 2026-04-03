import mongoose from 'mongoose';
import Booking from '../models/Booking';
import Vehicle from '../models/Vehicle';
import VehicleAllocation from '../models/VehicleAllocation';
import Room from '../models/Room';
import RoomAllocation from '../models/RoomAllocation';

type AllocateCarsResult =
  | { success: true; data: any[] }
  | { success: false; code: string; message: string; day_no?: number; required?: number; available?: number };

type AllocateRoomsResult =
  | { success: true; data: any[] }
  | { success: false; code: string; message: string; day_no?: number; required?: number; available?: number };

type CapacityItem = { capacity: number };

const ROOM_MESSAGES = {
  ROOM_ALREADY_USED: 'Phòng đã được sử dụng',
  ROOM_MISSING_BY_DAY: 'Thiếu phòng theo ngày',
  NOT_ENOUGH_CAPACITY: 'Không đủ sức chứa',
} as const;

const getBookingPaxCount = (booking: any): number => {
  const passengersCount = Array.isArray(booking?.passengers) ? booking.passengers.length : 0;
  if (passengersCount > 0) return passengersCount;

  const guestsCount = Array.isArray(booking?.guests) ? booking.guests.length : 0;
  if (guestsCount > 0) return guestsCount;

  const groupSize = Number(booking?.groupSize || 0);
  return Number.isFinite(groupSize) ? groupSize : 0;
};

const toStartOfDay = (value: Date | string): Date => {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
};

const addDays = (date: Date, offset: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() + offset);
  return d;
};

const dedupeByPlate = (rows: any[]) => {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.plate)) return false;
    seen.add(row.plate);
    return true;
  });
};

const dedupeByRoomId = (rows: any[]) => {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const id = String(row._id);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

/**
 * Chọn subset items sao cho tổng capacity >= required với ưu tiên:
 * - Ít item nhất
 * - Dư chỗ (sum - required) ít nhất
 * - Nếu hoà, ưu tiên tổng lớn hơn (ổn định theo sort đầu vào)
 *
 * Lưu ý: items là các "phòng/xe" cụ thể (mỗi item chỉ dùng 1 lần).
 */
const pickOptimizedCover = <T extends CapacityItem>(items: T[], required: number): T[] => {
  if (!Array.isArray(items) || items.length === 0 || required <= 0) return [];

  const normalized = items
    .map((it) => ({ it, cap: Math.max(0, Number(it.capacity || 0)) }))
    .filter((x) => x.cap > 0);
  if (normalized.length === 0) return [];

  // sort giảm dần theo sức chứa (theo yêu cầu) để tie-break ổn định.
  normalized.sort((a, b) => b.cap - a.cap);

  const maxCap = normalized.reduce((m, x) => Math.max(m, x.cap), 0);
  const maxSum = required + maxCap; // đủ để so sánh dư chỗ nhỏ nhất

  type State = { rooms: number; prevSum: number; idx: number };
  const dp: Array<State | null> = Array.from({ length: maxSum + 1 }, () => null);
  dp[0] = { rooms: 0, prevSum: -1, idx: -1 };

  for (let i = 0; i < normalized.length; i += 1) {
    const cap = normalized[i].cap;
    for (let s = maxSum - cap; s >= 0; s -= 1) {
      const cur = dp[s];
      if (!cur) continue;
      const ns = s + cap;
      const candidateRooms = cur.rooms + 1;
      const existing = dp[ns];
      if (!existing || candidateRooms < existing.rooms) {
        dp[ns] = { rooms: candidateRooms, prevSum: s, idx: i };
      }
    }
  }

  let bestSum = -1;
  let bestRooms = Number.POSITIVE_INFINITY;
  let bestWaste = Number.POSITIVE_INFINITY;

  for (let sum = required; sum <= maxSum; sum += 1) {
    const st = dp[sum];
    if (!st) continue;
    const waste = sum - required;
    if (
      st.rooms < bestRooms ||
      (st.rooms === bestRooms && waste < bestWaste) ||
      (st.rooms === bestRooms && waste === bestWaste && sum > bestSum)
    ) {
      bestSum = sum;
      bestRooms = st.rooms;
      bestWaste = waste;
    }
  }

  if (bestSum < 0) return [];

  const picked: T[] = [];
  let sum = bestSum;
  while (sum > 0) {
    const st = dp[sum];
    if (!st || st.idx < 0) break;
    picked.push(normalized[st.idx].it);
    sum = st.prevSum;
  }

  // Giữ output sort giảm dần theo capacity cho dễ nhìn / ổn định.
  return picked.sort((a, b) => Number((b as any).capacity || 0) - Number((a as any).capacity || 0));
};

/** Giữ nguyên phần phân bổ khác (phòng / xe) khi cập nhật từng loại. */
const mergeAllocatedServices = async (bookingId: mongoose.Types.ObjectId, patch: Record<string, unknown>) => {
  const booking: any = await Booking.findById(bookingId).lean();
  const prev =
    booking?.allocated_services && typeof booking.allocated_services === 'object' ? booking.allocated_services : {};
  const next = {
    ...prev,
    ...patch,
    updated_at: new Date(),
  };
  await Booking.findByIdAndUpdate(bookingId, { $set: { allocated_services: next } });
};

export const autoAllocateCarsForBooking = async (bookingId: string): Promise<AllocateCarsResult> => {
  const booking: any = await Booking.findById(bookingId).populate('tour_id', 'duration_days suppliers status');
  if (!booking) {
    return { success: false, code: 'BOOKING_NOT_FOUND', message: 'Không tìm thấy booking' };
  }

  const tourStatus =
    booking.tour_id && typeof booking.tour_id === 'object' ? (booking.tour_id as { status?: string }).status : null;
  if (tourStatus !== 'active') {
    return {
      success: false,
      code: 'TOUR_NOT_ACTIVE',
      message: 'Chỉ có thể phân bổ xe/phòng khi tour đang hoạt động',
    };
  }

  const groupSize = getBookingPaxCount(booking);
  if (groupSize <= 0) {
    return { success: false, code: 'INVALID_GROUP_SIZE', message: 'groupSize không hợp lệ' };
  }

  const durationDays = Number(booking?.tour_id?.duration_days || 1);
  const startDate = toStartOfDay(booking.startDate);

  const supplierIds: string[] = Array.isArray(booking?.tour_id?.suppliers)
    ? booking.tour_id.suppliers.map((id: any) => String(id))
    : [];

  await VehicleAllocation.deleteMany({ booking_id: booking._id });

  const allAllocations: any[] = [];

  for (let dayNo = 1; dayNo <= durationDays; dayNo += 1) {
    const serviceDate = addDays(startDate, dayNo - 1);

    const vehicleFilter: any = { status: 'active' };
    if (supplierIds.length > 0) {
      vehicleFilter.provider_id = { $in: supplierIds };
    }

    const activeCars = await Vehicle.find(vehicleFilter)
      .sort({ capacity: -1, plate: 1 })
      .lean();

    const freeCars: any[] = [];
    for (const car of activeCars) {
      const occupied = await VehicleAllocation.findOne({
        vehicle_id: car._id,
        service_date: serviceDate,
        status: { $in: ['reserved', 'confirmed'] },
      }).lean();
      if (occupied) continue;
      freeCars.push(car);
    }

    let pickedCars: any[] = [];
    const freeCarsAsc = [...freeCars].sort((a, b) => {
      if (Number(a.capacity) !== Number(b.capacity)) return Number(a.capacity) - Number(b.capacity);
      return String(a.plate || '').localeCompare(String(b.plate || ''));
    });
    const single = freeCarsAsc.find((c) => Number(c.capacity || 0) >= groupSize);
    if (single) {
      pickedCars = [single];
    } else {
      let covered = 0;
      const freeCarsDesc = [...freeCars].sort((a, b) => {
        if (Number(a.capacity) !== Number(b.capacity)) return Number(b.capacity) - Number(a.capacity);
        return String(a.plate || '').localeCompare(String(b.plate || ''));
      });
      for (const car of freeCarsDesc) {
        pickedCars.push(car);
        covered += Number(car.capacity || 0);
        if (covered >= groupSize) break;
      }

      if (covered < groupSize) {
        await VehicleAllocation.deleteMany({ booking_id: booking._id });
        await mergeAllocatedServices(booking._id, { cars: [] });
        return {
          success: false,
          code: 'NOT_ENOUGH_CAR',
          message: `Không đủ xe cho ngày ${dayNo}`,
          day_no: dayNo,
          required: groupSize,
          available: covered,
        };
      }
    }

    const uniqueCars = dedupeByPlate(pickedCars);
    const insertedRows: any[] = [];

    for (const car of uniqueCars) {
      try {
        const created = await VehicleAllocation.create({
          booking_id: booking._id,
          vehicle_id: car._id,
          plate: car.plate,
          provider_id: car.provider_id,
          day_no: dayNo,
          service_date: serviceDate,
          capacity: car.capacity,
          status: 'reserved',
        });
        insertedRows.push(created.toObject());
      } catch (error: any) {
        if (error?.code === 11000) {
          continue;
        }
        throw error;
      }
    }

    const dayCapacity = insertedRows.reduce((sum, item) => sum + Number(item.capacity || 0), 0);
    if (dayCapacity < groupSize) {
      await VehicleAllocation.deleteMany({ booking_id: booking._id });
      await mergeAllocatedServices(booking._id, { cars: [] });
      return {
        success: false,
        code: 'NOT_ENOUGH_CAR',
        message: `Không đủ xe cho ngày ${dayNo} (xung đột phân bổ đồng thời)`,
        day_no: dayNo,
        required: groupSize,
        available: dayCapacity,
      };
    }

    allAllocations.push(...insertedRows);
  }

  const prettyRows = allAllocations.map((a) => ({
    day_no: a.day_no,
    service_date: a.service_date,
    plate: a.plate,
    capacity: a.capacity,
    status: a.status,
    provider_id: a.provider_id,
    vehicle_allocation_id: a._id,
  }));

  await mergeAllocatedServices(booking._id, { cars: prettyRows });

  return { success: true, data: prettyRows };
};

export const autoAllocateRoomsForBooking = async (bookingId: string): Promise<AllocateRoomsResult> => {
  const booking: any = await Booking.findById(bookingId).populate('tour_id', 'duration_days suppliers status');
  if (!booking) {
    return { success: false, code: 'BOOKING_NOT_FOUND', message: 'Không tìm thấy booking' };
  }

  const tourStatus =
    booking.tour_id && typeof booking.tour_id === 'object' ? (booking.tour_id as { status?: string }).status : null;
  if (tourStatus !== 'active') {
    return {
      success: false,
      code: 'TOUR_NOT_ACTIVE',
      message: 'Chỉ có thể phân bổ xe/phòng khi tour đang hoạt động',
    };
  }

  const groupSize = getBookingPaxCount(booking);
  if (groupSize <= 0) {
    return { success: false, code: 'INVALID_GROUP_SIZE', message: 'groupSize không hợp lệ' };
  }

  const durationDays = Number(booking?.tour_id?.duration_days || 1);
  const startDate = toStartOfDay(booking.startDate);

  const supplierIds: string[] = Array.isArray(booking?.tour_id?.suppliers)
    ? booking.tour_id.suppliers.map((id: any) => String(id))
    : [];

  await RoomAllocation.deleteMany({ booking_id: booking._id });

  const allRoomAllocations: any[] = [];

  for (let dayNo = 1; dayNo <= durationDays; dayNo += 1) {
    const serviceDate = addDays(startDate, dayNo - 1);

    const roomFilter: any = { status: 'active' };
    if (supplierIds.length > 0) {
      roomFilter.provider_id = { $in: supplierIds };
    }

    const activeRooms = await Room.find(roomFilter)
      .populate('hotel_id', 'name')
      .sort({ max_occupancy: -1, room_number: 1 })
      .lean();

    const freeRooms: any[] = [];
    for (const room of activeRooms) {
      const occupied = await RoomAllocation.findOne({
        room_id: room._id,
        service_date: serviceDate,
        status: { $in: ['reserved', 'confirmed'] },
      }).lean();
      if (occupied) continue;
      freeRooms.push(room);
    }

    const freeRoomsWithCap = freeRooms.map((r) => ({ ...r, capacity: Number(r.max_occupancy || 0) }));
    const pickedRooms = pickOptimizedCover<any>(freeRoomsWithCap, groupSize);
    const covered = pickedRooms.reduce((sum, r) => sum + Number(r.max_occupancy || r.capacity || 0), 0);
    const totalFreeCapacity = freeRooms.reduce((sum, r) => sum + Number(r.max_occupancy || 0), 0);
    if (covered < groupSize) {
      await RoomAllocation.deleteMany({ booking_id: booking._id });
      await mergeAllocatedServices(booking._id, { rooms: [] });
      return {
        success: false,
        code: totalFreeCapacity < groupSize ? 'NOT_ENOUGH_CAPACITY' : 'ROOM_MISSING_BY_DAY',
        message: totalFreeCapacity < groupSize ? ROOM_MESSAGES.NOT_ENOUGH_CAPACITY : ROOM_MESSAGES.ROOM_MISSING_BY_DAY,
        day_no: dayNo,
        required: groupSize,
        available: totalFreeCapacity,
      };
    }

    const uniqueRooms = dedupeByRoomId(pickedRooms);
    const insertedRows: any[] = [];

    for (const room of uniqueRooms) {
      const hotelDoc = room.hotel_id as any;
      const hotelName = hotelDoc?.name ? String(hotelDoc.name) : 'Khách sạn';
      const hotelId = hotelDoc?._id || room.hotel_id;

      try {
        const created = await RoomAllocation.create({
          booking_id: booking._id,
          room_id: room._id,
          hotel_id: hotelId,
          hotel_name: hotelName,
          room_number: room.room_number,
          provider_id: room.provider_id,
          day_no: dayNo,
          service_date: serviceDate,
          max_occupancy: room.max_occupancy,
          status: 'reserved',
        });
        insertedRows.push(created.toObject());
      } catch (error: any) {
        if (error?.code === 11000) {
          continue;
        }
        throw error;
      }
    }

    const nightCapacity = insertedRows.reduce((sum, item) => sum + Number(item.max_occupancy || 0), 0);
    if (nightCapacity < groupSize) {
      await RoomAllocation.deleteMany({ booking_id: booking._id });
      await mergeAllocatedServices(booking._id, { rooms: [] });
      return {
        success: false,
        code: 'ROOM_ALREADY_USED',
        message: ROOM_MESSAGES.ROOM_ALREADY_USED,
        day_no: dayNo,
        required: groupSize,
        available: nightCapacity,
      };
    }

    allRoomAllocations.push(...insertedRows);
  }

  const prettyRows = allRoomAllocations.map((a) => ({
    day_no: a.day_no,
    service_date: a.service_date,
    hotel_id: a.hotel_id,
    hotel_name: a.hotel_name,
    room_number: a.room_number,
    max_occupancy: a.max_occupancy,
    status: a.status,
    provider_id: a.provider_id,
    room_allocation_id: a._id,
  }));

  await mergeAllocatedServices(booking._id, { rooms: prettyRows });

  return { success: true, data: prettyRows };
};
