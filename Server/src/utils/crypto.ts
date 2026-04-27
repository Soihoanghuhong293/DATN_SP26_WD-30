import crypto from 'node:crypto';

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

export function sha256(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function generateOtp6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

