import type { RequestHandler } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createUser, findUserByEmail, updateUserByEmail } from '../utils/store.js';
import { generateOtp6, randomToken, sha256 } from '../utils/crypto.js';
import { sendMail } from '../utils/mailer.js';

function getJwtSecret() {
  return process.env.JWT_SECRET || 'dev-secret-change-me';
}

function normalizeEmail(email: string) {
  return String(email || '').trim().toLowerCase();
}

export const register: RequestHandler = async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || '');

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Thiếu thông tin' });
  }

  const exists = await findUserByEmail(email);
  if (exists) {
    return res.status(409).json({ message: 'Email đã được đăng ký' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const id = randomToken(12);

  await createUser({
    id,
    name,
    email,
    passwordHash,
    role: 'user',
    reset: null,
  });

  return res.status(201).json({ message: 'Đăng ký thành công' });
};

export const login: RequestHandler = async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || '');

  if (!email || !password) {
    return res.status(400).json({ message: 'Thiếu thông tin' });
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
  }

  const token = jwt.sign({ sub: user.id, role: user.role, email: user.email }, getJwtSecret(), {
    expiresIn: '7d',
  });

  return res.json({ token, role: user.role });
};

export const forgotPassword: RequestHandler = async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!email) return res.status(400).json({ message: 'Vui lòng nhập email' });

  const user = await findUserByEmail(email);

  // Always return success to avoid leaking whether email exists.
  if (!user) {
    return res.json({ message: 'Nếu email tồn tại, hệ thống đã gửi hướng dẫn đặt lại mật khẩu.' });
  }

  const otp = generateOtp6();
  const token = randomToken(32);
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  await updateUserByEmail(email, {
    reset: {
      otpHash: sha256(otp),
      tokenHash: sha256(token),
      expiresAt,
    },
  });

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const resetLink = `${clientUrl}/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(
    token
  )}`;

  await sendMail({
    to: email,
    subject: 'Đặt lại mật khẩu',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5">
        <h2>Yêu cầu đặt lại mật khẩu</h2>
        <p>Mã OTP của bạn (hết hạn sau 10 phút):</p>
        <div style="font-size: 24px; font-weight: 700; letter-spacing: 4px">${otp}</div>
        <p>Hoặc bấm vào liên kết sau để đặt lại mật khẩu:</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>Nếu bạn không yêu cầu thao tác này, vui lòng bỏ qua email.</p>
      </div>
    `,
  });

  return res.json({ message: 'Nếu email tồn tại, hệ thống đã gửi hướng dẫn đặt lại mật khẩu.' });
};

export const verifyForgotPasswordOtp: RequestHandler = async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const otp = String(req.body?.otp || '').trim();
  if (!email || !otp) return res.status(400).json({ message: 'Thiếu thông tin' });

  const user = await findUserByEmail(email);
  if (!user?.reset) return res.status(400).json({ message: 'OTP không hợp lệ hoặc đã hết hạn' });
  if (Date.now() > user.reset.expiresAt) return res.status(400).json({ message: 'OTP không hợp lệ hoặc đã hết hạn' });

  if (sha256(otp) !== user.reset.otpHash) {
    return res.status(400).json({ message: 'OTP không hợp lệ hoặc đã hết hạn' });
  }

  // Return the existing reset token (still time-bounded) so client can proceed without clicking email link.
  const resetToken = randomToken(32);
  await updateUserByEmail(email, {
    reset: {
      ...user.reset,
      tokenHash: sha256(resetToken),
    },
  });

  return res.json({ token: resetToken, expiresAt: user.reset.expiresAt });
};

export const resetPassword: RequestHandler = async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const token = String(req.body?.token || '').trim();
  const newPassword = String(req.body?.newPassword || '');

  if (!email || !token || !newPassword) return res.status(400).json({ message: 'Thiếu thông tin' });

  const user = await findUserByEmail(email);
  if (!user?.reset) return res.status(400).json({ message: 'Link/Token không hợp lệ hoặc đã hết hạn' });
  if (Date.now() > user.reset.expiresAt) return res.status(400).json({ message: 'Link/Token không hợp lệ hoặc đã hết hạn' });

  if (sha256(token) !== user.reset.tokenHash) {
    return res.status(400).json({ message: 'Link/Token không hợp lệ hoặc đã hết hạn' });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await updateUserByEmail(email, { passwordHash, reset: null });

  return res.json({ message: 'Cập nhật mật khẩu thành công' });
};