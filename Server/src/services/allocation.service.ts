import Booking from '../models/Booking';
import Vehicle from '../models/Vehicle';
import VehicleAllocation from '../models/VehicleAllocation';

type AllocateCarsResult =
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

export const autoAllocateCarsForBooking = async (bookingId: string): Promise<AllocateCarsResult> => {
  const booking: any = await Booking.findById(bookingId).populate('tour_id', 'duration_days suppliers');
  if (!booking) {
    return { success: false, code: 'BOOKING_NOT_FOUND', message: 'Không tìm thấy booking' };
  }

  // Số khách thực tế để phân bổ:
  // - Nếu booking đã có passengers (danh sách khách hiện tại) thì dùng length
  // - Ngược lại (booking mới) thì fallback về groupSize
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

  // Xoá phân bổ xe cũ của booking này để tránh trùng dữ liệu khi chạy lại
  await VehicleAllocation.deleteMany({ booking_id: booking._id });

  const allAllocations: any[] = [];

  for (let dayNo = 1; dayNo <= durationDays; dayNo += 1) {
    const serviceDate = addDays(startDate, dayNo - 1);

    // Xe active của các nhà cung cấp đã gán cho tour (nếu có),
    // ưu tiên xe lớn trước, nếu bằng nhau thì theo biển số
    const vehicleFilter: any = { status: 'active' };
    if (supplierIds.length > 0) {
      vehicleFilter.provider_id = { $in: supplierIds };
    }

    const activeCars = await Vehicle.find(vehicleFilter)
      .sort({ capacity: -1, plate: 1 })
      .lean();

    // Lấy tất cả xe còn trống ngày này
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

    // Ưu tiên chiến lược:
    // 1) Nếu chỉ cần 1 xe mà có xe capacity >= groupSize thì chọn xe NHỎ NHẤT đủ (tránh pick luôn 29 chỗ khi có 7 chỗ).
    // 2) Nếu không có xe đơn lẻ đủ thì fallback greedy: chọn xe lớn trước để giảm số lượng xe.
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
      // freeCars đang theo thứ tự capacity desc từ query, nhưng đảm bảo vẫn sort đúng để greedy hoạt động
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
        // rollback các xe đã giữ của booking này (tránh để lại reserved rải rác)
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
        // Trường hợp race condition do request song song: duplicate key
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

  // Lưu tóm tắt vào booking để FE hiển thị nhanh
  await Booking.findByIdAndUpdate(booking._id, {
    $set: {
      allocated_services: {
        cars: prettyRows,
        updated_at: new Date(),
      },
    },
  });

  return { success: true, data: prettyRows };
};
