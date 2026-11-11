const mongoose = require('mongoose');
const { Schema } = mongoose;

const NOTIFICATION_TYPES = ['assignment', 'submission', 'feedback', 'system'];

const notificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, default: 'system' },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, trim: true, maxlength: 500 },
    assignment: { type: Schema.Types.ObjectId, ref: 'Assignment' },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

notificationSchema.set('toJSON', {
  versionKey: false,
  transform: (_d, ret) => { ret.id = String(ret._id); delete ret._id; return ret; },
});

module.exports = mongoose.model('Notification', notificationSchema);
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
