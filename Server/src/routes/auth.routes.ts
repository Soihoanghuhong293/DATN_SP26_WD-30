import { Router } from 'express';
import {
  forgotPassword,
  login,
  register,
  resetPassword,
  verifyForgotPasswordOtp,
} from '../controllers/auth.controller.js';

export const authRouter = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);

authRouter.post('/forgot-password', forgotPassword);
authRouter.post('/forgot-password/verify-otp', verifyForgotPasswordOtp);
authRouter.post('/reset-password', resetPassword);

