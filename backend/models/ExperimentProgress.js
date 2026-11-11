const mongoose = require('mongoose');
const { Schema } = mongoose;
const crypto = require('crypto');

const PROGRESS_STATUSES = ['not_started', 'in_progress', 'completed'];

const observationSchema = new Schema(
  {
    label: { type: String, trim: true, maxlength: 100 },
    value: { type: String, trim: true, maxlength: 200 },
    unit: { type: String, trim: true, maxlength: 20 },
    recordedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const progressSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    experiment: { type: Schema.Types.ObjectId, ref: 'Experiment', required: true },
    assignment: { type: Schema.Types.ObjectId, ref: 'Assignment' },
    status: { type: String, enum: PROGRESS_STATUSES, default: 'not_started' },
    parameters: { type: Schema.Types.Mixed },        // last simulation settings, e.g. { voltage: 6, resistance: 10 }
    observations: [observationSchema],
    calculations: [{ _id: false, label: String, expression: String, value: String }],
    result: { type: String, trim: true, maxlength: 2000 },
    quizScore: { type: Number, min: 0, max: 100 },
    timeSpentSeconds: { type: Number, min: 0, default: 0 },
    startedAt: Date,
    completedAt: Date,
    lastAccessedAt: { type: Date, default: Date.now },
    // Offline sync: id generated on the device so re-sending the same record can never create a duplicate.
    clientId: { type: String, default: () => crypto.randomUUID() },
    syncedAt: Date,
  },
  { timestamps: true }
);

progressSchema.index({ user: 1, experiment: 1 }, { unique: true });
progressSchema.index({ user: 1, clientId: 1 }, { unique: true });
progressSchema.index({ user: 1, lastAccessedAt: -1 });
progressSchema.index({ experiment: 1, status: 1 });

progressSchema.set('toJSON', {
  versionKey: false,
  transform: (_d, ret) => { ret.id = String(ret._id); delete ret._id; return ret; },
});

module.exports = mongoose.model('ExperimentProgress', progressSchema);
module.exports.PROGRESS_STATUSES = PROGRESS_STATUSES;
