const mongoose = require('mongoose');
const { Schema } = mongoose;

const ACTIVITY_TYPES = [
  'login',
  'experiment_started',
  'experiment_completed',
  'observation_saved',
  'quiz_attempted',
  'record_created',
  'record_downloaded',
  'assignment_submitted',
  'ai_question',
];

const activitySchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ACTIVITY_TYPES, required: true },
    experiment: { type: Schema.Types.ObjectId, ref: 'Experiment' },
    assignment: { type: Schema.Types.ObjectId, ref: 'Assignment' },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

activitySchema.index({ user: 1, createdAt: -1 });
activitySchema.index({ type: 1, createdAt: -1 });
activitySchema.index({ createdAt: -1 });

activitySchema.set('toJSON', {
  versionKey: false,
  transform: (_d, ret) => { ret.id = String(ret._id); delete ret._id; return ret; },
});

module.exports = mongoose.model('StudentActivity', activitySchema);
module.exports.ACTIVITY_TYPES = ACTIVITY_TYPES;
