const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { Assignment, Experiment, User, Notification, StudentActivity } = require('../models');
const { localizeContent } = require('../utils/localize');

const EXPERIMENT_FIELDS = 'slug topic difficulty simulationKey subject content';

function shape(a, lang = 'en') {
  const o = a.toJSON();
  if (a.experiment && a.experiment.content) {
    const e = a.experiment;
    o.experiment = {
      id: String(e._id),
      slug: e.slug,
      topic: e.topic,
      difficulty: e.difficulty,
      simulationKey: e.simulationKey,
      title: localizeContent(e.content, lang).title,
    };
  }
  if (a.subject && a.subject.key) o.subject = { id: String(a.subject._id), key: a.subject.key, name: a.subject.name.en };
  if (a.student && a.student.name) o.student = a.student.toJSON();
  if (a.teacher && a.teacher.name) o.teacher = { id: String(a.teacher._id), name: a.teacher.name };
  o.isOverdue = ['assigned', 'in_progress'].includes(a.status) && a.dueDate.getTime() < Date.now();
  return o;
}

// Finds an assignment only if it belongs to the caller. Others get a 404 (not 403) so ids cannot be probed.
async function findOwned(req, id) {
  const ownerField = req.user.role === 'teacher' ? 'teacher' : 'student';
  const doc = await Assignment.findOne({ _id: id, [ownerField]: req.user._id });
  if (!doc) throw ApiError.notFound('Assignment not found');
  return doc;
}

// ---------- Teacher ----------
exports.create = asyncHandler(async (req, res) => {
  const { studentIds, experimentId, dueDate, instructions } = req.body;
  const uniqueIds = [...new Set(studentIds)];

  const experiment = await Experiment.findOne({ _id: experimentId, isPublished: true });
  if (!experiment) throw ApiError.notFound('Experiment not found');

  const students = await User.find({ _id: { $in: uniqueIds }, role: 'student', isActive: true });
  const foundIds = new Set(students.map((s) => String(s._id)));
  const skipped = uniqueIds.filter((id) => !foundIds.has(id)).map((id) => ({ studentId: id, reason: 'Student not found' }));

  const existing = await Assignment.find({ teacher: req.user._id, experiment: experiment._id, student: { $in: [...foundIds] } }).select('student');
  const already = new Set(existing.map((a) => String(a.student)));
  existing.forEach((a) => skipped.push({ studentId: String(a.student), reason: 'Already assigned' }));

  const toCreate = students.filter((s) => !already.has(String(s._id)));
  if (toCreate.length === 0) {
    return res.status(409).json({ success: false, message: 'No new assignments were created', details: skipped });
  }

  const created = await Assignment.insertMany(
    toCreate.map((s) => ({
      teacher: req.user._id,
      student: s._id,
      experiment: experiment._id,
      subject: experiment.subject,
      dueDate,
      instructions,
    }))
  );

  const title = experiment.content.en.title;
  await Notification.insertMany(
    created.map((a) => ({
      user: a.student,
      type: 'assignment',
      title: 'New experiment assigned',
      message: `${title} - due ${dueDate.toDateString()}`,
      assignment: a._id,
    }))
  );

  res.status(201).json({ success: true, created: created.map((a) => a.toJSON()), skipped });
});

exports.update = asyncHandler(async (req, res) => {
  const a = await findOwned(req, req.params.id);
  if (a.status === 'reviewed') throw ApiError.conflict('A reviewed assignment can no longer be edited');
  a.set(req.body);
  await a.save();
  res.json({ success: true, assignment: a });
});

exports.review = asyncHandler(async (req, res) => {
  const a = await findOwned(req, req.params.id);
  if (a.status !== 'submitted') throw ApiError.conflict('Only submitted assignments can be reviewed');
  a.feedback = req.body.feedback;
  if (req.body.marks !== undefined) a.marks = req.body.marks;
  a.status = 'reviewed';
  a.reviewedAt = new Date();
  await a.save();
  await Notification.create({
    user: a.student,
    type: 'feedback',
    title: 'Your practical was reviewed',
    message: a.feedback.slice(0, 200),
    assignment: a._id,
  });
  res.json({ success: true, assignment: a });
});

exports.remove = asyncHandler(async (req, res) => {
  const a = await findOwned(req, req.params.id);
  if (['submitted', 'reviewed'].includes(a.status)) throw ApiError.conflict('Submitted or reviewed assignments cannot be deleted');
  await a.deleteOne();
  res.json({ success: true, message: 'Assignment deleted' });
});

// ---------- Student ----------
exports.updateStatus = asyncHandler(async (req, res) => {
  const a = await findOwned(req, req.params.id);
  const next = req.body.status;
  const allowed = {
    assigned: ['in_progress', 'submitted'],
    in_progress: ['submitted'],
    submitted: [],
    reviewed: [],
  };
  if (!allowed[a.status].includes(next)) throw ApiError.conflict(`Cannot change status from "${a.status}" to "${next}"`);

  a.status = next;
  if (next === 'submitted') a.submittedAt = new Date();
  await a.save();

  if (next === 'submitted') {
    await Promise.all([
      StudentActivity.create({ user: req.user._id, type: 'assignment_submitted', experiment: a.experiment, assignment: a._id }),
      Notification.create({
        user: a.teacher,
        type: 'submission',
        title: 'New submission',
        message: `${req.user.name} submitted an assignment`,
        assignment: a._id,
      }),
    ]);
  }
  res.json({ success: true, assignment: a });
});

// ---------- Shared (teacher sees what they assigned, student sees what was assigned to them) ----------
exports.list = asyncHandler(async (req, res) => {
  const { status, student, experiment, lang, page, limit } = req.query;
  const isTeacher = req.user.role === 'teacher';
  const filter = isTeacher ? { teacher: req.user._id } : { student: req.user._id };
  if (status) filter.status = status;
  if (experiment) filter.experiment = experiment;
  if (student && isTeacher) filter.student = student; // students cannot widen their own scope

  const [total, items] = await Promise.all([
    Assignment.countDocuments(filter),
    Assignment.find(filter)
      .sort({ dueDate: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('experiment', EXPERIMENT_FIELDS)
      .populate('subject', 'key name')
      .populate(isTeacher ? 'student' : 'teacher', isTeacher ? 'name email grade section school' : 'name'),
  ]);

  res.json({
    success: true,
    assignments: items.map((a) => shape(a, lang)),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

exports.getOne = asyncHandler(async (req, res) => {
  const owner = req.user.role === 'teacher' ? 'teacher' : 'student';
  const a = await Assignment.findOne({ _id: req.params.id, [owner]: req.user._id })
    .populate('experiment', EXPERIMENT_FIELDS)
    .populate('subject', 'key name')
    .populate(owner === 'teacher' ? 'student' : 'teacher', owner === 'teacher' ? 'name email grade section school' : 'name');
  if (!a) throw ApiError.notFound('Assignment not found');
  res.json({ success: true, assignment: shape(a, req.query.lang) });
});
