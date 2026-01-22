// Định nghĩa class lỗi tùy chỉnh
export class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // Lỗi do người dùng/logic (không phải lỗi hệ thống crash)

    Error.captureStackTrace(this, this.constructor);
  }
}