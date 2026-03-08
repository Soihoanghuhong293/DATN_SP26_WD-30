import { Request, Response } from 'express';
import Booking from '../models/Booking.js';
import ContactMessage from '../models/ContactMessage.js';
import Tour from '../models/Tour.js';

/**
 * GET /api/v1/dashboard/stats
 * Thống kê tổng quan cho admin
 */
export const getStats = async (req: Request, res: Response) => {
  try {
    const [bookings, unreadMessages, tourCount] = await Promise.all([
      Booking.find(),
      ContactMessage.countDocuments({ status: 'unread' }),
      Tour.countDocuments({ status: 'active' }),
    ]);

    const totalBookings = bookings.length;
    const totalRevenue = bookings
      .filter((b) => b.status === 'paid' || b.status === 'confirmed')
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
