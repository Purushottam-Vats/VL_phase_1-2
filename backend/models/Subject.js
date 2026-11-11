const mongoose = require('mongoose');

const i18n = (required = false) => ({
  en: { type: String, required, trim: true },
  kn: { type: String, trim: true },
  hi: { type: String, trim: true },
});

const subjectSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[a-z0-9-]+$/ },
    name: i18n(true),
    description: i18n(false),
    icon: { type: String, default: 'flask-conical' }, // lucide icon name used by the UI
    color: { type: String, default: '#2563eb' },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

subjectSchema.set('toJSON', {
  versionKey: false,
  transform: (_d, ret) => { ret.id = String(ret._id); delete ret._id; return ret; },
});

module.exports = mongoose.model('Subject', subjectSchema);
