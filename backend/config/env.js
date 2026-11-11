// Central configuration. Loads backend/.env first, then the project-root .env (if present).
// Values that are already set in the real environment are never overridden.
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';
const isTest = NODE_ENV === 'test';

let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  if (isProd) {
    throw new Error('JWT_SECRET must be set to a random string of at least 32 characters in production.');
  }
  if (!isTest) {
    console.warn('[config] JWT_SECRET missing or shorter than 32 chars - using an INSECURE development default.');
  }
  JWT_SECRET = JWT_SECRET && JWT_SECRET.length >= 8 ? JWT_SECRET : 'dev-only-insecure-secret-change-me-please-32chars';
}

const env = {
  NODE_ENV,
  isProd,
  isTest,
  PORT: Number(process.env.PORT) || 5000,
  // 127.0.0.1 (not "localhost") avoids IPv6 "::1" connection-refused errors on Windows.
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/virtual-lab',
  JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CLIENT_ORIGINS: (process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  // Teacher self-registration is only allowed with this code. Empty = teacher sign-up disabled.
  TEACHER_INVITE_CODE: process.env.TEACHER_INVITE_CODE || '',
  BCRYPT_ROUNDS: isTest ? 4 : Number(process.env.BCRYPT_ROUNDS) || 12,
  RATE_LIMIT_ENABLED: !isTest && process.env.RATE_LIMIT_ENABLED !== 'false',
  AUTH_RATE_LIMIT_MAX: Number(process.env.AUTH_RATE_LIMIT_MAX) || 30,
};

module.exports = env;
