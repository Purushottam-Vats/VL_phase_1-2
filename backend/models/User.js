const mongoose = require('mongoose');

const ROLES = ['student', 'teacher'];
const LANGUAGES = ['en', 'kn', 'hi'];
const GRADES = ['6', '7', '8', '9', '10', '11', '12'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 120,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'Invalid email address'],
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true },
    school: { type: String, trim: true, maxlength: 120 },
    grade: { type: String, enum: GRADES },
    section: { type: String, trim: true, uppercase: true, maxlength: 5 },
    preferredLanguage: { type: String, enum: LANGUAGES, default: 'en' },
    isActive: { type: Boolean, default: true },
    lastLoginAt: Date,
  },
  { timestamps: true }
);

// Teacher dashboards filter students by class/section.
userSchema.index({ role: 1, grade: 1, section: 1 });

userSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.passwordHash;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
module.exports.ROLES = ROLES;
module.exports.LANGUAGES = LANGUAGES;
module.exports.GRADES = GRADES;
