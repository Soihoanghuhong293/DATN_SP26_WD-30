import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

import connectDB from './config/database.js';
import { AppError } from './utils/AppError.js';

// Import Routes
import guideRouter from './routes/guide.routes.js';
import tourRouter from './routes/tourRoutes.js';
import categoryRoutes from './routes/category.routes.js';

dotenv.config();

// 1. Khởi tạo app
const app = express();
const PORT = process.env.PORT || 5000;

// 2. Connect Database
connectDB();

// 3. Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// 4. Routes
app.get('/', (req: Request, res: Response) => {
  res.send('API is running...');
});

app.use('/api/v1/guides', guideRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/categories', categoryRoutes);

// 5. Handle Undefined Routes
app.use((req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// 6. Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
  });
});

// 7. Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

export default app;