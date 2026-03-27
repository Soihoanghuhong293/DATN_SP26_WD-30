import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

import connectDB from './config/database.js';
import { AppError } from './utils/AppError.js';

// Routes
import guideRouter from './routes/guide.routes.js';
import tourRouter from './routes/tourRoutes.js';
import categoryRoutes from './routes/category.routes.js';
import authRoutes from './routes/auth.route.js'; 
import userRoutes from './routes/user.route.js'; // Đã import
import providerRoutes from './routes/provider.routes.js';
import vehicleRoutes from './routes/vehicle.routes';
import hotelRoutes from './routes/hotel.routes';
import roomRoutes from './routes/room.routes';

import bookingRouter from './routes/bookingRoutes';
import chatRouter from './routes/chat.routes.js';
import contactMessageRouter from './routes/contactMessage.routes.js';

import holidayPricingRoutes from './routes/holidayPricing.routes';
import uploadRoutes from './routes/upload.routes.js';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));

// Static files (uploaded images)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Test root
app.get('/', (req: Request, res: Response) => {
  res.send('API is running...');
});

// API routes
app.use('/api/v1/guides', guideRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes); // 👈 THÊM DÒNG NÀY ĐỂ KÍCH HOẠT API USERS
app.use('/api/v1/providers', providerRoutes);
app.use('/api/v1/vehicles', vehicleRoutes);
app.use('/api/v1/hotels', hotelRoutes);
app.use('/api/v1/rooms', roomRoutes);
app.use('/api/v1/bookings', bookingRouter);
app.use('/api/v1/chat', chatRouter);
app.use('/api/v1/contact-messages', contactMessageRouter);

app.use('/api/v1/holiday-pricings', holidayPricingRoutes);
app.use('/api/v1/uploads', uploadRoutes);
// Handle 404https://gemini.google.com/gems/view
app.use((req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global error
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

export default app;