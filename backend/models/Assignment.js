const mongoose = require('mongoose');
const { Schema } = mongoose;

const ASSIGNMENT_STATUSES = ['assigned', 'in_progress', 'submitted', 'reviewed'];

const assignmentSchema = new Schema(
  {
    teacher: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    experiment: { type: Schema.Types.ObjectId, ref: 'Experiment', required: true },
    subject: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    instructions: { type: String, trim: true, maxlength: 500 },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: ASSIGNMENT_STATUSES, default: 'assigned' },
    submittedAt: Date,
    reviewedAt: Date,
    feedback: { type: String, trim: true, maxlength: 1000 },
    marks: { type: Number, min: 0, max: 100 },
    practicalRecord: { type: Schema.Types.ObjectId, ref: 'PracticalRecord' },
  },
  { timestamps: true }
);

assignmentSchema.index({ student: 1, status: 1, dueDate: 1 });
assignmentSchema.index({ teacher: 1, createdAt: -1 });
assignmentSchema.index({ teacher: 1, status: 1 });
// A teacher can assign a given experiment to a given student only once.
assignmentSchema.index({ student: 1, experiment: 1, teacher: 1 }, { unique: true });

assignmentSchema.set('toJSON', {
  versionKey: false,
  transform: (_d, ret) => { ret.id = String(ret._id); delete ret._id; return ret; },
});

module.exports = mongoose.model('Assignment', assignmentSchema);
module.exports.ASSIGNMENT_STATUSES = ASSIGNMENT_STATUSES;
