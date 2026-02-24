import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import connectDB from './config/database.js';
import { AppError } from './utils/AppError.js';

import guideRouter from './routes/guide.routes.js';
// Import Routes
// import tourRouter from './routes/tour.routes';

import dotenv from 'dotenv';


import tourRouter from './routes/tourRoutes';

// Load biến môi trường
dotenv.config();

// 1. Kết nối Database

const app = express();

// 2. Middlewares (Chạy trước Routes)
app.use(cors());
app.use(express.json()); // Đọc JSON body
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
app.use(morgan('dev')); // Log request

app.use('/api/v1/guides', guideRouter);

connectDB();

app.get('/', (req, res) => {
  res.send('API is running...');
});

app.use('/api/v1/tours', tourRouter);

app.use((req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});

export default app;