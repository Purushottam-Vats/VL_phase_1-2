const { z } = require('zod');
const { language } = require('./common');

const password = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/\d/, 'Password must contain at least one number');

const email = z.string({ required_error: 'Email is required' }).trim().toLowerCase().email('Enter a valid email').max(120);
const optionalText = (max) => z.string().trim().max(max).optional();
const grade = z.enum(['6', '7', '8', '9', '10', '11', '12']);

// Unknown keys (e.g. isActive, _id, passwordHash) are stripped by zod, so they can never reach the database.
const register = z.object({
  name: z.string({ required_error: 'Name is required' }).trim().min(2, 'Name must be at least 2 characters').max(80),
  email,
  password,
  role: z.enum(['student', 'teacher'], { errorMap: () => ({ message: 'Role must be student or teacher' }) }),
  school: optionalText(120),
  grade: grade.optional(),
  section: optionalText(5),
  preferredLanguage: language.default('en'),
  inviteCode: z.string().max(100).optional(),
});

const login = z.object({
  email,
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required').max(72),
});

const updateProfile = z
  .object({
    name: z.string().trim().min(2).max(80),
    school: optionalText(120),
    grade,
    section: optionalText(5),
    preferredLanguage: language,
  })
  .partial();

const changePassword = z.object({
  currentPassword: z.string().min(1, 'Current password is required').max(72),
  newPassword: password,
});

module.exports = { register, login, updateProfile, changePassword };
