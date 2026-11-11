const mongoose = require('mongoose');
const { Schema } = mongoose;
const crypto = require('crypto');

const RECORD_STATUSES = ['draft', 'submitted', 'reviewed'];

const recordSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    experiment: { type: Schema.Types.ObjectId, ref: 'Experiment', required: true },
    assignment: { type: Schema.Types.ObjectId, ref: 'Assignment' },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    // Snapshot of the student at the time of writing, so printed records stay stable.
    studentInfo: {
      name: { type: String, trim: true },
      school: { type: String, trim: true },
      grade: { type: String, trim: true },
      section: { type: String, trim: true },
    },
    sections: {
      objective: { type: String, trim: true, maxlength: 2000 },
      introduction: { type: String, trim: true, maxlength: 4000 },
      equipment: [{ type: String, trim: true }],
      procedure: [{ type: String, trim: true }],
      observations: [{ _id: false, label: String, value: String, unit: String }],
      calculations: { type: String, trim: true, maxlength: 4000 },
      result: { type: String, trim: true, maxlength: 2000 },
      conclusion: { type: String, trim: true, maxlength: 3000 },
    },
    language: { type: String, enum: ['en', 'kn', 'hi'], default: 'en' },
    status: { type: String, enum: RECORD_STATUSES, default: 'draft' },
    performedOn: { type: Date, default: Date.now },
    teacherReview: {
      comment: { type: String, trim: true, maxlength: 1000 },
      marks: { type: Number, min: 0, max: 100 },
      reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      reviewedAt: Date,
    },
    clientId: { type: String, default: () => crypto.randomUUID() }, // offline-sync de-duplication key
    syncedAt: Date,
  },
  { timestamps: true }
);

recordSchema.index({ user: 1, createdAt: -1 });
recordSchema.index({ user: 1, clientId: 1 }, { unique: true });
recordSchema.index({ experiment: 1, status: 1 });
recordSchema.index({ status: 1, createdAt: -1 });

recordSchema.set('toJSON', {
  versionKey: false,
  transform: (_d, ret) => { ret.id = String(ret._id); delete ret._id; return ret; },
});

module.exports = mongoose.model('PracticalRecord', recordSchema);
module.exports.RECORD_STATUSES = RECORD_STATUSES;
