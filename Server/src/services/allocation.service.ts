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
  const booking: any = await Booking.findById(bookingId).populate('tour_id', 'duration_days suppliers');
  if (!booking) {
    return { success: false, code: 'BOOKING_NOT_FOUND', message: 'Không tìm thấy booking' };
  }

  const currentPaxCount = Array.isArray(booking.passengers) ? booking.passengers.length : 0;
  const groupSize = currentPaxCount > 0 ? currentPaxCount : Number(booking.groupSize || 0);
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
  const booking: any = await Booking.findById(bookingId).populate('tour_id', 'duration_days suppliers');
  if (!booking) {
    return { success: false, code: 'BOOKING_NOT_FOUND', message: 'Không tìm thấy booking' };
  }

  const currentPaxCount = Array.isArray(booking.passengers) ? booking.passengers.length : 0;
  const groupSize = currentPaxCount > 0 ? currentPaxCount : Number(booking.groupSize || 0);
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

    let pickedRooms: any[] = [];
    const freeRoomsAsc = [...freeRooms].sort((a, b) => {
      if (Number(a.max_occupancy) !== Number(b.max_occupancy))
        return Number(a.max_occupancy) - Number(b.max_occupancy);
      return String(a.room_number || '').localeCompare(String(b.room_number || ''));
    });
    const single = freeRoomsAsc.find((r) => Number(r.max_occupancy || 0) >= groupSize);
    if (single) {
      pickedRooms = [single];
    } else {
      let covered = 0;
      const freeRoomsDesc = [...freeRooms].sort((a, b) => {
        if (Number(a.max_occupancy) !== Number(b.max_occupancy))
          return Number(b.max_occupancy) - Number(a.max_occupancy);
        return String(a.room_number || '').localeCompare(String(b.room_number || ''));
      });
      for (const room of freeRoomsDesc) {
        pickedRooms.push(room);
        covered += Number(room.max_occupancy || 0);
        if (covered >= groupSize) break;
      }

      if (covered < groupSize) {
        await RoomAllocation.deleteMany({ booking_id: booking._id });
        return {
          success: false,
          code: 'NOT_ENOUGH_ROOM',
          message: `Không đủ phòng cho đêm ngày ${dayNo}`,
          day_no: dayNo,
          required: groupSize,
          available: covered,
        };
      }
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
      return {
        success: false,
        code: 'NOT_ENOUGH_ROOM',
        message: `Không đủ phòng cho đêm ngày ${dayNo} (xung đột phân bổ đồng thời)`,
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
