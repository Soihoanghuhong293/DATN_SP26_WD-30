import Passenger from '../models/Passenger';
import SeatingAllocation from '../models/SeatingAllocation';
import RoomingAllocation from '../models/RoomingAllocation';
import TripVehicle from '../models/TripVehicle';
import TripRoom from '../models/TripRoom';

export const tripKeyOf = (tourId: string, dateStr: string) => `${tourId}:${dateStr}`;


export async function validateTripAllocationsForStart(
  tourId: string,
  dateStr: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const tripKey = tripKeyOf(tourId, dateStr);

  const passengers = await Passenger.find({ trip_key: tripKey }).lean();
  if (passengers.length === 0) {
    return { ok: true };
  }

  const [seating, rooming, vehicles, rooms] = await Promise.all([
    SeatingAllocation.find({ trip_key: tripKey }).lean(),
    RoomingAllocation.find({ trip_key: tripKey }).lean(),
    TripVehicle.find({ trip_key: tripKey }).lean(),
    TripRoom.find({ trip_key: tripKey }).lean(),
  ]);

  const seatingByPassenger = new Map<string, any>();
  seating.forEach((s: any) => seatingByPassenger.set(String(s.passenger_id), s));

  const roomingByPassenger = new Map<string, any>();
  rooming.forEach((r: any) => roomingByPassenger.set(String(r.passenger_id), r));

  for (const p of passengers) {
    const pid = String((p as any)._id);
    const name = String((p as any).full_name || '').trim() || pid;
    if (!seatingByPassenger.has(pid)) {
      return {
        ok: false,
        message: `Chưa xếp đủ chỗ trên xe cho khách: ${name}. Vui lòng hoàn tất điều hành xe trước khi bắt đầu chuyến.`,
      };
    }
    if (!roomingByPassenger.has(pid)) {
      return {
        ok: false,
        message: `Chưa xếp đủ phòng khách sạn cho khách: ${name}. Vui lòng hoàn tất xếp phòng trước khi bắt đầu chuyến.`,
      };
    }
  }

  const vehicleById = new Map<string, any>(vehicles.map((v: any) => [String(v._id), v]));
  const countsByVehicle = new Map<string, number>();
  for (const s of seating) {
    const vid = String((s as any).trip_vehicle_id || '');
    if (!vid || !vehicleById.has(vid)) {
      return {
        ok: false,
        message: 'Dữ liệu ghế xe không khớp xe trong chuyến. Vui lòng kiểm tra lại điều hành.',
      };
    }
    countsByVehicle.set(vid, (countsByVehicle.get(vid) || 0) + 1);
  }
  for (const v of vehicles) {
    const vid = String(v._id);
    const cnt = countsByVehicle.get(vid) || 0;
    const cap = Math.max(0, Number(v.seat_count || 0));
    if (cnt > cap) {
      const plate = String(v.plate || '').trim();
      return {
        ok: false,
        message: `Xe${plate ? ` ${plate}` : ''} đã vượt số chỗ (${cnt}/${cap}). Vui lòng điều chỉnh ghế hoặc đổi xe.`,
      };
    }
  }

  const roomById = new Map<string, any>(rooms.map((r: any) => [String(r._id), r]));
  const countsByRoom = new Map<string, number>();
  for (const r of rooming) {
    const rid = String((r as any).trip_room_id || '');
    if (!rid || !roomById.has(rid)) {
      return {
        ok: false,
        message: 'Dữ liệu phòng không khớp phòng trong chuyến. Vui lòng kiểm tra lại xếp phòng.',
      };
    }
    countsByRoom.set(rid, (countsByRoom.get(rid) || 0) + 1);
  }
  for (const room of rooms) {
    const rid = String(room._id);
    const cnt = countsByRoom.get(rid) || 0;
    const cap = Math.max(0, Number(room.capacity || 0));
    if (cnt > cap) {
      const rn = String(room.room_number || '').trim();
      return {
        ok: false,
        message: `Phòng${rn ? ` ${rn}` : ''} vượt sức chứa (${cnt}/${cap}). Vui lòng điều chỉnh danh sách hoặc phòng.`,
      };
    }
  }

  return { ok: true };
}
