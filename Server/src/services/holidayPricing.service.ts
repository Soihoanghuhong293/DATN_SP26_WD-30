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
  const date = new Date(departureDate);

  // tìm quy tắc ngày khởi hànhtrong thời gian áp dụng
  const applicableRules = await HolidayPricing.find({
    start_date: { $lte: date },
    end_date: { $gte: date },
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