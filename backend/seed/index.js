/* Seeds the database with subjects, experiments, demo users, assignments and a little activity.
 *
 *   npm run seed          -> idempotent: creates what is missing and refreshes experiment content
 *   npm run seed:reset    -> wipes ALL collections first, then seeds (refused in production without --force)
 */
const bcrypt = require('bcryptjs');
const env = require('../config/env');
const { connectDB, disconnectDB } = require('../config/db');
const models = require('../models');
const subjectsData = require('./data/subjects');
const experimentsData = require('./data/experiments');
const { teachers, students } = require('./data/users');

const { User, Subject, Experiment, Assignment, ExperimentProgress, PracticalRecord, StudentActivity, Notification } = models;
const DAY = 24 * 60 * 60 * 1000;

async function runSeed({ reset = false, quiet = false } = {}) {
  const log = quiet ? () => {} : (...a) => console.log(...a);

  if (reset) {
    await Promise.all(Object.values(models).map((m) => m.deleteMany({})));
    log('[seed] existing data removed');
  }
  await Promise.all(Object.values(models).map((m) => m.init())); // make sure indexes exist

  // ---- subjects ----
  const subjectByKey = {};
  for (const s of subjectsData) {
    subjectByKey[s.key] = await Subject.findOneAndUpdate({ key: s.key }, { $set: s }, { upsert: true, new: true, setDefaultsOnInsert: true });
  }

  // ---- experiments (save() so schema validation runs) ----
  const expBySlug = {};
  for (const e of experimentsData) {
    const doc = (await Experiment.findOne({ slug: e.slug })) || new Experiment({ slug: e.slug });
    doc.set({ ...e, subject: subjectByKey[e.subject]._id });
    await doc.save();
    expBySlug[e.slug] = doc;
  }

  // ---- users ----
  const userByEmail = {};
  for (const u of [...teachers, ...students]) {
    let doc = await User.findOne({ email: u.email });
    if (!doc) {
      const { password, ...rest } = u;
      doc = await User.create({ ...rest, passwordHash: await bcrypt.hash(password, env.BCRYPT_ROUNDS) });
    }
    userByEmail[u.email] = doc;
  }
  const t1 = userByEmail['teacher1@example.com'];
  const t2 = userByEmail['teacher2@example.com'];
  const st = (n) => userByEmail[`student${n}@example.com`];

  // ---- assignments ----
  // [teacher, student, experiment slug, due offset (days), status]
  const plan = [
    [t1, st(1), 'ohms-law', 5, 'assigned'],
    [t1, st(2), 'ohms-law', 5, 'in_progress'],
    [t1, st(3), 'ohms-law', -2, 'assigned'], // overdue
    [t1, st(1), 'plant-cell-structure', 7, 'submitted'],
    [t1, st(2), 'plant-cell-structure', 7, 'reviewed'],
    [t1, st(4), 'acid-base-indicators', 4, 'assigned'],
    [t1, st(5), 'acid-base-indicators', 4, 'in_progress'],
    [t2, st(6), 'simple-pendulum', 6, 'assigned'],
    [t2, st(7), 'separation-of-mixtures', 3, 'assigned'],
    [t2, st(8), 'photosynthesis', 8, 'submitted'],
  ];
  const assignmentDocs = [];
  for (const [teacher, student, slug, offset, status] of plan) {
    const exp = expBySlug[slug];
    const extra = {};
    if (['submitted', 'reviewed'].includes(status)) extra.submittedAt = new Date(Date.now() - DAY);
    if (status === 'reviewed') Object.assign(extra, { reviewedAt: new Date(), feedback: 'Well done - observations are clear and complete.', marks: 18 });
    const a = await Assignment.findOneAndUpdate(
      { teacher: teacher._id, student: student._id, experiment: exp._id },
      { $setOnInsert: { subject: exp.subject, dueDate: new Date(Date.now() + offset * DAY), status, instructions: 'Record your observations carefully.', ...extra } },
      { upsert: true, new: true }
    );
    assignmentDocs.push(a);
  }

  // ---- a little progress / activity / notification data so dashboards have something to show ----
  const progressPlan = [
    [st(2), 'ohms-law', 'in_progress', { voltage: 6, resistance: 10 }, 0],
    [st(1), 'plant-cell-structure', 'completed', null, 80],
    [st(2), 'plant-cell-structure', 'completed', null, 100],
    [st(8), 'photosynthesis', 'completed', null, 67],
  ];
  for (const [student, slug, status, parameters, quizScore] of progressPlan) {
    const exp = expBySlug[slug];
    await ExperimentProgress.findOneAndUpdate(
      { user: student._id, experiment: exp._id },
      {
        $setOnInsert: {
          status,
          parameters,
          quizScore: status === 'completed' ? quizScore : undefined,
          startedAt: new Date(Date.now() - 2 * DAY),
          completedAt: status === 'completed' ? new Date(Date.now() - DAY) : undefined,
          lastAccessedAt: new Date(),
        },
      },
      { upsert: true }
    );
  }

  const cell = expBySlug['plant-cell-structure'];
  await PracticalRecord.findOneAndUpdate(
    { user: st(1)._id, experiment: cell._id },
    {
      $setOnInsert: {
        title: cell.content.en.title,
        assignment: assignmentDocs[3]._id,
        studentInfo: { name: st(1).name, school: st(1).school, grade: st(1).grade, section: st(1).section },
        sections: {
          objective: cell.content.en.objective,
          introduction: cell.content.en.introduction,
          equipment: cell.content.en.equipment,
          procedure: cell.content.en.steps,
          observations: [
            { label: 'Outermost rigid layer', value: 'Cell wall' },
            { label: 'Green organelles', value: 'Chloroplasts' },
          ],
          result: 'All major parts of the plant cell were identified.',
          conclusion: 'A plant cell has a cell wall, chloroplasts and a large vacuole in addition to the parts found in animal cells.',
        },
        status: 'submitted',
      },
    },
    { upsert: true }
  );

  if ((await StudentActivity.countDocuments()) === 0) {
    await StudentActivity.insertMany([
      { user: st(1)._id, type: 'experiment_completed', experiment: cell._id },
      { user: st(2)._id, type: 'experiment_started', experiment: expBySlug['ohms-law']._id },
      { user: st(8)._id, type: 'assignment_submitted', experiment: expBySlug['photosynthesis']._id },
    ]);
  }
  if ((await Notification.countDocuments()) === 0) {
    await Notification.insertMany(
      assignmentDocs
        .filter((a) => a.status === 'assigned')
        .map((a) => ({ user: a.student, type: 'assignment', title: 'New experiment assigned', assignment: a._id }))
    );
  }

  const counts = {
    users: await User.countDocuments(),
    subjects: await Subject.countDocuments(),
    experiments: await Experiment.countDocuments(),
    assignments: await Assignment.countDocuments(),
    progress: await ExperimentProgress.countDocuments(),
    records: await PracticalRecord.countDocuments(),
    activities: await StudentActivity.countDocuments(),
    notifications: await Notification.countDocuments(),
  };
  log('[seed] done:', counts);
  return counts;
}

module.exports = { runSeed };

if (require.main === module) {
  (async () => {
    const reset = process.argv.includes('--reset');
    if (reset && env.isProd && !process.argv.includes('--force')) {
      console.error('Refusing to wipe a production database. Re-run with --reset --force if you are sure.');
      process.exit(1);
    }
    try {
      await connectDB();
      await runSeed({ reset });
      console.log('\nDemo logins:\n  teacher1@example.com / Teacher@123\n  student1@example.com / Student@123');
    } catch (err) {
      console.error('[seed] failed:', err.message);
      process.exitCode = 1;
    } finally {
      await disconnectDB();
    }
  })();
}
