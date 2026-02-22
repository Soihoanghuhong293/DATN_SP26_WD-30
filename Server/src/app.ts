import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Import file kết nối DB và Route
import connectDB from './config/database'; 
import { AppError } from './utils/AppError';
import tourRouter from './routes/tourRoutes';

// Load biến môi trường
dotenv.config();

// 1. Kết nối Database
connectDB();

const app = express();

// 2. Middlewares (Chạy trước Routes)
app.use(cors());
app.use(express.json()); // Đọc JSON body
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// 3. Routes
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Gắn Tour Router
app.use('/api/v1/tours', tourRouter);

// 4. Handle 404 Not Found (Đặt sau cùng các routes)
app.use((req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// 5. Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message
  });
});

// --- PHẦN QUAN TRỌNG MỚI THÊM: KHỞI ĐỘNG SERVER ---
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});

// Export default app (để sau này test nếu cần)
export default app;