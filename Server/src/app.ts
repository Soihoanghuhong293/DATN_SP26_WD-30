import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

import connectDB from './config/database.js';
import { AppError } from './utils/AppError.js';

dotenv.config();

const app = express();

// 1. Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// 2. Connect DB
connectDB();

// 3. Routes
app.get('/', (req, res) => {
  res.send('API is running...');
});

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
