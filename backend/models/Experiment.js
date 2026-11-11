const mongoose = require('mongoose');
const { Schema } = mongoose;

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];

// Translatable content. English is mandatory (validated below); kn / hi may be partial -
// missing fields fall back to English when served (see utils/localize.js).
const contentSchema = new Schema(
  {
    title: { type: String, trim: true, maxlength: 150 },
    objective: { type: String, trim: true, maxlength: 1000 },
    introduction: { type: String, trim: true, maxlength: 3000 },
    equipment: [{ type: String, trim: true }],
    steps: [{ type: String, trim: true }],
    explanation: { type: String, trim: true, maxlength: 4000 },
    relatedQuestions: [{ type: String, trim: true }],
    ruralContext: { type: String, trim: true, maxlength: 1500 },
  },
  { _id: false }
);

const quizQuestionSchema = new Schema(
  {
    question: { type: String, required: true, trim: true },
    options: {
      type: [String],
      validate: { validator: (v) => Array.isArray(v) && v.length >= 2 && v.length <= 6, message: 'A question needs 2-6 options' },
    },
    correctIndex: { type: Number, required: true, min: 0 },
    explanation: { type: String, trim: true },
  },
  { _id: false }
);

const experimentSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[a-z0-9-]+$/ },
    subject: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    topic: { type: String, required: true, trim: true, maxlength: 100 },
    difficulty: { type: String, enum: DIFFICULTIES, default: 'beginner' },
    estimatedMinutes: { type: Number, min: 1, max: 240, default: 20 },
    // Key used by the frontend simulation registry to load the matching simulation component (Phase 4).
    simulationKey: { type: String, required: true, trim: true },
    content: {
      en: { type: contentSchema, required: true },
      kn: contentSchema,
      hi: contentSchema,
    },
    quiz: [quizQuestionSchema],
    tags: [{ type: String, lowercase: true, trim: true }],
    order: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

experimentSchema.index({ subject: 1, isPublished: 1, order: 1 });
experimentSchema.index({ difficulty: 1 });
experimentSchema.index({ tags: 1 });

experimentSchema.pre('validate', function (next) {
  const en = this.content && this.content.en;
  if (!en || !en.title || !en.objective || !en.introduction || !en.steps || en.steps.length === 0) {
    this.invalidate('content.en', 'English title, objective, introduction and at least one step are required');
  }
  (this.quiz || []).forEach((q, i) => {
    if (q.options && q.correctIndex >= q.options.length) {
      this.invalidate(`quiz.${i}.correctIndex`, 'correctIndex must point to one of the options');
    }
  });
  next();
});

experimentSchema.set('toJSON', {
  versionKey: false,
  transform: (_d, ret) => { ret.id = String(ret._id); delete ret._id; return ret; },
});

module.exports = mongoose.model('Experiment', experimentSchema);
module.exports.DIFFICULTIES = DIFFICULTIES;
