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
import authRoutes from './routes/auth.route';
import providerRoutes from './routes/provider.routes.js';


import bookingRouter from './routes/bookingRoutes';
import chatRouter from './routes/chat.routes.js';
import contactMessageRouter from './routes/contactMessage.routes.js';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

//mid
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Test root
app.get('/', (req: Request, res: Response) => {
  res.send('API is running...');
});

// API routes
app.use('/api/v1/guides', guideRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/auth', authRoutes); // 👈 THÊM DÒNG NÀY
app.use('/api/v1/providers', providerRoutes);

app.use('/api/v1/bookings', bookingRouter);
app.use('/api/v1/chat', chatRouter);
app.use('/api/v1/contact-messages', contactMessageRouter);

// Handle 404
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