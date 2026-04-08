import { Request, Response } from 'express';
import Booking from '../models/Booking.js';
import ContactMessage from '../models/ContactMessage.js';
import Tour from '../models/Tour.js';
import Room from '../models/Room.js';
import Vehicle from '../models/Vehicle.js';
import RoomAllocation from '../models/RoomAllocation.js';
import VehicleAllocation from '../models/VehicleAllocation.js';
import ProviderTicket from '../models/ProviderTicket.js';

type Period = 'day' | 'month' | 'year';

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function getKpiRanges(period: Period, anchor: Date) {
  const a = new Date(anchor);
  if (period === 'day') {
    const start = startOfDay(a);
    const end = endOfDay(a);
    const prevStart = startOfDay(addDays(a, -1));
    const prevEnd = endOfDay(addDays(a, -1));
    return { current: [start, end] as const, previous: [prevStart, prevEnd] as const };
  }
  if (period === 'month') {
    const start = new Date(a.getFullYear(), a.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(a.getFullYear(), a.getMonth() + 1, 0, 23, 59, 59, 999);
    const prevStart = new Date(a.getFullYear(), a.getMonth() - 1, 1, 0, 0, 0, 0);
    const prevEnd = new Date(a.getFullYear(), a.getMonth(), 0, 23, 59, 59, 999);
    return { current: [start, end] as const, previous: [prevStart, prevEnd] as const };
  }
  const start = new Date(a.getFullYear(), 0, 1, 0, 0, 0, 0);
  const end = new Date(a.getFullYear(), 11, 31, 23, 59, 59, 999);
  const prevStart = new Date(a.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
  const prevEnd = new Date(a.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
  return { current: [start, end] as const, previous: [prevStart, prevEnd] as const };
}

function inRange(ts: Date, start: Date, end: Date): boolean {
  const t = ts.getTime();
  return t >= start.getTime() && t <= end.getTime();
}

function pctDelta(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function slotForTourDate(tour: any, startDate: Date): number {
  const ds = tour?.departure_schedule as { date?: string; slots?: number }[] | undefined;
  if (!Array.isArray(ds) || ds.length === 0) return 0;
  const key = toYmd(startDate);
  const row = ds.find((x) => String(x?.date || '').slice(0, 10) === key);
  if (row && typeof row.slots === 'number' && row.slots > 0) return row.slots;
  const first = ds.find((x) => typeof x?.slots === 'number' && x.slots > 0);
  return first?.slots ?? 0;
}

function revenueOf(b: any): number {
  return Number(b.total_price || 0);
}

function countsTowardRevenue(b: any): boolean {
  if (b.status === 'cancelled') return false;
  const ps = b.payment_status;
  return ps === 'paid' || ps === 'deposit';
}

/** GET /api/v1/dashboard/stats — tương thích cũ */
export const getStats = async (req: Request, res: Response) => {
  try {
    const [bookings, unreadMessages, tourCount] = await Promise.all([
      Booking.find(),
      ContactMessage.countDocuments({ status: 'unread' }),
      Tour.countDocuments({ status: 'active' }),
    ]);

    const totalBookings = bookings.length;
    const totalRevenue = bookings
      .filter(
        (b) =>
          b.status !== 'cancelled' &&
          (b.payment_status === 'paid' || b.payment_status === 'deposit'),
      )
      .reduce((sum, b) => sum + (b.total_price || 0), 0);

    res.json({
      success: true,
      data: {
        totalBookings,
        totalRevenue,
        unreadMessages,
        tourCount,
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Lỗi tải thống kê' });
  }
};

/** GET /api/v1/dashboard/overview */
export const getAdminOverview = async (req: Request, res: Response) => {
  try {
    const period = (String(req.query.period || 'month') as Period) || 'month';
    const safePeriod: Period = ['day', 'month', 'year'].includes(period) ? period : 'month';
    const anchorRaw = req.query.anchor ? new Date(String(req.query.anchor)) : new Date();
    const anchor = Number.isNaN(anchorRaw.getTime()) ? new Date() : anchorRaw;

    const { current, previous } = getKpiRanges(safePeriod, anchor);
    const [cStart, cEnd] = current;
    const [pStart, pEnd] = previous;

    const [
      allTours,
      bookingsLean,
      totalTourCount,
      activeTourCount,
      roomTotal,
      vehicleTotal,
      ticketTotal,
    ] = await Promise.all([
      Tour.find().select('name status departure_schedule created_at').lean(),
      Booking.find()
        .populate({ path: 'tour_id', select: 'name departure_schedule' })
        .populate({ path: 'guide_id', select: 'name' })
        .sort({ created_at: -1 })
        .lean(),
      Tour.countDocuments(),
      Tour.countDocuments({ status: 'active' }),
      Room.countDocuments({ status: 'active' }),
      Vehicle.countDocuments({ status: 'active' }),
      ProviderTicket.countDocuments({ status: 'active' }),
    ]);

    const tourById = new Map<string, any>(allTours.map((t: any) => [String(t._id), t]));

    const filterCreatedIn = (b: any, start: Date, end: Date) => {
      const t = new Date(b.created_at || b.startDate);
      return inRange(t, start, end) && b.status !== 'cancelled';
    };

    const kpiCurr = bookingsLean.filter((b) => filterCreatedIn(b, cStart, cEnd));
    const kpiPrev = bookingsLean.filter((b) => filterCreatedIn(b, pStart, pEnd));

    const sumRevenue = (arr: any[]) =>
      arr.filter(countsTowardRevenue).reduce((s, b) => s + revenueOf(b), 0);
    const countBookings = (arr: any[]) => arr.length;
    const sumPassengers = (arr: any[]) =>
      arr.reduce((s, b) => s + (Number(b.groupSize) || 0), 0);

    const occupancyFor = (arr: any[]) => {
      let num = 0;
      let den = 0;
      for (const b of arr) {
        if (b.status === 'cancelled') continue;
        const tid = b.tour_id?._id ? String(b.tour_id._id) : String(b.tour_id || '');
        const tour = tourById.get(tid) || (b.tour_id && typeof b.tour_id === 'object' ? b.tour_id : null);
        const slot = slotForTourDate(tour, new Date(b.startDate));
        const gs = Number(b.groupSize) || 0;
        if (slot > 0) {
          num += gs;
          den += slot;
        }
      }
      if (den <= 0) return null;
      return Math.min(100, Math.round((num / den) * 1000) / 10);
    };

    const revenueCurr = sumRevenue(kpiCurr);
    const revenuePrev = sumRevenue(kpiPrev);
    const bookingsCurr = countBookings(kpiCurr);
    const bookingsPrev = countBookings(kpiPrev);
    const passengersCurr = sumPassengers(kpiCurr);
    const passengersPrev = sumPassengers(kpiPrev);
    const occCurr = occupancyFor(kpiCurr);
    const occPrev = occupancyFor(kpiPrev);

    /** Khách mới / quay lại theo SĐT (trong kỳ hiện tại) */
    const phonesInCurr = new Set<string>();
    kpiCurr.forEach((b) => {
      if (b.customer_phone) phonesInCurr.add(String(b.customer_phone).trim());
    });
    let newCustomers = 0;
    let returningCustomers = 0;
    for (const phone of phonesInCurr) {
      const hadBefore = bookingsLean.some(
        (b) =>
          b.customer_phone &&
          String(b.customer_phone).trim() === phone &&
          new Date(b.created_at || b.startDate).getTime() < cStart.getTime() &&
          b.status !== 'cancelled',
      );
      if (hadBefore) returningCustomers += 1;
      else newCustomers += 1;
    }

    const topCustomersMap = new Map<string, { phone: string; name: string; count: number }>();
    bookingsLean.forEach((b) => {
      if (b.status === 'cancelled') return;
      const phone = String(b.customer_phone || '').trim();
      if (!phone) return;
      const cur = topCustomersMap.get(phone) || {
        phone,
        name: String(b.customer_name || phone),
        count: 0,
      };
      cur.count += 1;
      if (b.customer_name) cur.name = String(b.customer_name);
      topCustomersMap.set(phone, cur);
    });
    const topCustomers = [...topCustomersMap.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const since = new Date();
    since.setDate(since.getDate() - 90);
    const tourCountMap = new Map<string, { name: string; bookings: number; revenue: number }>();
    bookingsLean.forEach((b) => {
      if (b.status === 'cancelled') return;
      const cd = new Date(b.created_at || b.startDate);
      if (cd < since) return;
      const tid = b.tour_id?._id ? String(b.tour_id._id) : '';
      const name = (b.tour_id as any)?.name || 'Tour';
      const row = tourCountMap.get(tid || name) || { name, bookings: 0, revenue: 0 };
      row.bookings += 1;
      if (countsTowardRevenue(b)) row.revenue += revenueOf(b);
      tourCountMap.set(tid || name, row);
    });
    const topTours = [...tourCountMap.values()].sort((a, b) => b.bookings - a.bookings).slice(0, 5);

    const now = new Date();
    const d1 = startOfDay(addDays(now, 1));
    const d3 = endOfDay(addDays(now, 3));
    const departSoonRaw = bookingsLean.filter(
      (b) =>
        b.status !== 'cancelled' &&
        inRange(new Date(b.startDate), d1, d3),
    );
    const pendingBookings = bookingsLean.filter((b) => b.status === 'pending').slice(0, 15);
    const noGuideBookings = bookingsLean
      .filter(
        (b) =>
          b.status === 'confirmed' &&
          !b.guide_id &&
          new Date(b.startDate).getTime() >= startOfDay(now).getTime(),
      )
      .slice(0, 15);

    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const nextWeekEnd = endOfDay(addDays(now, 7));

    const [roomIdsToday, roomAllocNextWeek] = await Promise.all([
      RoomAllocation.distinct('room_id', {
        service_date: { $gte: todayStart, $lte: todayEnd },
        status: { $in: ['reserved', 'confirmed'] },
      }),
      RoomAllocation.countDocuments({
        service_date: { $gte: todayStart, $lte: nextWeekEnd },
        status: { $in: ['reserved', 'confirmed'] },
      }),
    ]);
    const usedRoomsToday = roomIdsToday.length;
    const roomUsagePct = roomTotal > 0 ? Math.round((usedRoomsToday / roomTotal) * 1000) / 10 : 0;

    const [vehIdsToday] = await Promise.all([
      VehicleAllocation.distinct('vehicle_id', {
        service_date: { $gte: todayStart, $lte: todayEnd },
        status: { $in: ['reserved', 'confirmed'] },
      }),
    ]);
    const usedVehiclesToday = vehIdsToday.length;
    const vehicleUsagePct = vehicleTotal > 0 ? Math.round((usedVehiclesToday / vehicleTotal) * 1000) / 10 : 0;

    const ticketRefsCount = await Booking.countDocuments({
      'optional_ticket_ids.0': { $exists: true },
      status: { $ne: 'cancelled' },
    });

    const lowRoom = roomTotal > 0 && roomUsagePct >= 85;
    const lowVehicle = vehicleTotal > 0 && vehicleUsagePct >= 85;
    /** Model vé không có tồn kho; cảnh báo khi thiếu loại vé hoặc nhiều đơn dùng vé add-on */
    const lowTicket = ticketTotal === 0 && ticketRefsCount > 0;

    /** Biểu đồ: các bucket gần đây */
    const chartPoints: { label: string; revenue: number; bookings: number; start: string }[] = [];
    if (safePeriod === 'day') {
      for (let i = 13; i >= 0; i -= 1) {
        const day = startOfDay(addDays(anchor, -i));
        const dend = endOfDay(day);
        const label = `${String(day.getDate()).padStart(2, '0')}/${String(day.getMonth() + 1).padStart(2, '0')}`;
        const bucket = bookingsLean.filter((b) => filterCreatedIn(b, day, dend));
        chartPoints.push({
          label,
          revenue: sumRevenue(bucket),
          bookings: bucket.length,
          start: day.toISOString(),
        });
      }
    } else if (safePeriod === 'month') {
      for (let i = 11; i >= 0; i -= 1) {
        const ref = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
        const ms = new Date(ref.getFullYear(), ref.getMonth(), 1, 0, 0, 0, 0);
        const me = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
        const label = `${String(ref.getMonth() + 1).padStart(2, '0')}/${ref.getFullYear()}`;
        const bucket = bookingsLean.filter((b) => filterCreatedIn(b, ms, me));
        chartPoints.push({
          label,
          revenue: sumRevenue(bucket),
          bookings: bucket.length,
          start: ms.toISOString(),
        });
      }
    } else {
      for (let i = 4; i >= 0; i -= 1) {
        const y = anchor.getFullYear() - i;
        const ys = new Date(y, 0, 1, 0, 0, 0, 0);
        const ye = new Date(y, 11, 31, 23, 59, 59, 999);
        const label = String(y);
        const bucket = bookingsLean.filter((b) => filterCreatedIn(b, ys, ye));
        chartPoints.push({
          label,
          revenue: sumRevenue(bucket),
          bookings: bucket.length,
          start: ys.toISOString(),
        });
      }
    }

    res.json({
      success: true,
      data: {
        period: safePeriod,
        anchor: anchor.toISOString(),
        kpi: {
          totalTours: totalTourCount,
          activeTours: activeTourCount,
          totalBookings: bookingsCurr,
          totalBookingsDelta: pctDelta(bookingsCurr, bookingsPrev),
          revenue: revenueCurr,
          revenueDelta: pctDelta(revenueCurr, revenuePrev),
          passengersServed: passengersCurr,
          passengersDelta: pctDelta(passengersCurr, passengersPrev),
          occupancyPct: occCurr,
          occupancyDelta:
            occCurr != null && occPrev != null ? Math.round((occCurr - occPrev) * 10) / 10 : null,
        },
        comparisonPrevious: {
          revenue: revenuePrev,
          bookings: bookingsPrev,
          passengers: passengersPrev,
          occupancyPct: occPrev,
        },
        charts: {
          revenueAndBookings: chartPoints,
        },
        topTours,
        alerts: {
          departuresSoon: departSoonRaw.slice(0, 10).map((b: any) => ({
            _id: String(b._id),
            startDate: b.startDate,
            customer_name: b.customer_name,
            tourName: (b.tour_id as any)?.name,
          })),
          pendingBookings: pendingBookings.map((b: any) => ({
            _id: String(b._id),
            customer_name: b.customer_name,
            tourName: (b.tour_id as any)?.name,
            startDate: b.startDate,
          })),
          unassignedGuide: noGuideBookings.map((b: any) => ({
            _id: String(b._id),
            customer_name: b.customer_name,
            tourName: (b.tour_id as any)?.name,
            startDate: b.startDate,
          })),
          resourceFlags: {
            roomsTight: lowRoom,
            vehiclesTight: lowVehicle,
            ticketsBusy: lowTicket,
            roomAllocationsNextWeek: roomAllocNextWeek,
          },
        },
        customers: {
          newInPeriod: newCustomers,
          returningInPeriod: returningCustomers,
          top: topCustomers,
        },
        resources: {
          rooms: {
            total: roomTotal,
            usedTodayDistinct: usedRoomsToday,
            freeApprox: Math.max(0, roomTotal - usedRoomsToday),
            usagePct: roomUsagePct,
          },
          vehicles: {
            total: vehicleTotal,
            usedTodayDistinct: usedVehiclesToday,
            freeApprox: Math.max(0, vehicleTotal - usedVehiclesToday),
            usagePct: vehicleUsagePct,
          },
          tickets: {
            activeProducts: ticketTotal,
            bookingsWithOptionalTickets: ticketRefsCount,
          },
        },
      },
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ success: false, message: 'Lỗi tải dữ liệu dashboard' });
  }
};
