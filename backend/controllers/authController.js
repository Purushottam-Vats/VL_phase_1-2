const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const { signToken } = require('../utils/token');
const { User, StudentActivity } = require('../models');

// Compared against when the email is unknown, so response time does not reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', env.BCRYPT_ROUNDS);

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();
const safeEqual = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, role, school, grade, section, preferredLanguage, inviteCode } = req.body;

  if (role === 'teacher') {
    if (!env.TEACHER_INVITE_CODE) {
      throw ApiError.forbidden('Teacher registration is disabled. Ask the administrator to set TEACHER_INVITE_CODE.');
    }
    if (!inviteCode || !safeEqual(inviteCode, env.TEACHER_INVITE_CODE)) {
      throw ApiError.forbidden('A valid teacher invite code is required');
    }
  }

  if (await User.exists({ email })) throw ApiError.conflict('An account with this email already exists');

  const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  const user = await User.create({ name, email, passwordHash, role, school, grade, section, preferredLanguage });

  res.status(201).json({ success: true, token: signToken(user), user });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+passwordHash');

  const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !ok) throw ApiError.unauthorized('Invalid email or password');
  if (!user.isActive) throw ApiError.forbidden('This account has been disabled');

  user.lastLoginAt = new Date();
  await user.save();
  if (user.role === 'student') {
    StudentActivity.create({ user: user._id, type: 'login' }).catch(() => {}); // best effort
  }

  res.json({ success: true, token: signToken(user), user });
});

exports.me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});

exports.updateMe = asyncHandler(async (req, res) => {
  req.user.set(req.body);
  await req.user.save();
  res.json({ success: true, user: req.user });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw ApiError.badRequest('Current password is incorrect');
  }
  user.passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);
  await user.save();
  res.json({ success: true, message: 'Password updated' });
});
