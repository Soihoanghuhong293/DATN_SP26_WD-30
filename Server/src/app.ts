import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import connectDB from './config/database.js';
import { AppError } from './utils/AppError.js';
import tourRouter from './routes/tour.routes.js';
import categoryRouter from './routes/category.routes.js';
// Import Routes
// import tourRouter from './routes/tour.routes';

import dotenv from 'dotenv';
dotenv.config();

const app = express();

// 1. Middlewares
app.use(cors()); // Cho phép Frontend gọi API
app.use(express.json()); // Đọc JSON body
app.use(morgan('dev')); // Log request
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/categories', categoryRouter);

// 2. Connect DB
connectDB();

// 3. Routes
app.get('/', (req, res) => {
  res.send('API is running...');
});
// app.use('/api/v1/tours', tourRouter);

// 4. Handle Undefined Routes
// 4. Handle Undefined Routes
app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// 5. Global Error Handler Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

export default app;

// Server Listen (thường tách ra file server.ts hoặc để cuối app.ts)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});