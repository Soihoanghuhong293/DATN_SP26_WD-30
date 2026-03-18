import mongoose from 'mongoose';
import HolidayPricing from '../models/HolidayPricing';

/**
 * tính giá cuối cùng của tour dựa trên ngày khởi hành và bên holidayy
 * @param tourId 
 * @param basePrice 
 * @param departureDate N
 * @returns giá sau khi đã áp dụng các quy tắc ngày lễ 
 */
export const calculateFinalPrice = async (
  tourId: string | mongoose.Types.ObjectId,
  basePrice: number,
  departureDate: Date | string
): Promise<number> => {
  // Tách lấy chính xác phần ngày YYYY-MM-DD
  const dateStr = typeof departureDate === 'string' 
    ? departureDate.split('T')[0] 
    : departureDate.toISOString().split('T')[0];

  const startOfSelectedDay = new Date(`${dateStr}T00:00:00.000Z`);
  const endOfSelectedDay = new Date(`${dateStr}T23:59:59.999Z`);

  const applicableRules = await HolidayPricing.find({
    // Bù trừ 10h để bao phủ cả trường hợp timezone lệch do MongoDB lưu UTC
    start_date: { $lte: new Date(endOfSelectedDay.getTime() + 10 * 60 * 60 * 1000) },
    end_date: { $gte: new Date(startOfSelectedDay.getTime() - 10 * 60 * 60 * 1000) },
    $or: [
      { tour_id: tourId },
      { tour_id: null },
      { tour_id: { $exists: false } }
    ]
  }).sort({ priority: -1 }); 

  if (applicableRules.length > 0) {
    const highestPriorityRule = applicableRules[0];

    if (highestPriorityRule.fixed_price !== undefined && highestPriorityRule.fixed_price !== null) {
      return highestPriorityRule.fixed_price;
    }
    return basePrice * highestPriorityRule.price_multiplier;
  }

  return basePrice;
};