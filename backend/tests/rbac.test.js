const { connect, disconnect, clearAll, api, registerUser, bearer } = require('./helpers');
const { runSeed } = require('../seed');
const { Experiment, Assignment, Notification } = require('../models');

const FUTURE = () => new Date(Date.now() + 5 * 86400000).toISOString();
let teacher, teacher2, s1, s2, ohm, cell;

beforeAll(connect);
afterAll(disconnect);
beforeEach(async () => {
  await clearAll();
  await runSeed({ quiet: true }); // experiments + subjects (+ demo users that these tests ignore)
  await Assignment.deleteMany({});
  teacher = await registerUser({ role: 'teacher' });
  teacher2 = await registerUser({ role: 'teacher' });
  s1 = await registerUser({ grade: '9', section: 'A' });
  s2 = await registerUser({ grade: '9', section: 'B' });
  ohm = await Experiment.findOne({ slug: 'ohms-law' });
  cell = await Experiment.findOne({ slug: 'plant-cell-structure' });
});

const assign = (t, body) => api().post('/api/assignments').set(bearer(t.token)).send(body);

describe('role-based access control', () => {
  test('unauthenticated requests get 401 on every protected route', async () => {
    for (const [m, p] of [['get', '/api/users/students'], ['get', '/api/assignments'], ['post', '/api/assignments'], ['get', '/api/subjects'], ['get', '/api/experiments']]) {
      expect((await api()[m](p)).status).toBe(401);
    }
  });

  test('students are blocked from teacher-only endpoints (403)', async () => {
    expect((await api().get('/api/users/students').set(bearer(s1.token))).status).toBe(403);
    const create = await assign(s1, { studentIds: [s1.user.id], experimentId: String(ohm._id), dueDate: FUTURE() });
    expect(create.status).toBe(403);
    expect(await Assignment.countDocuments()).toBe(0);
  });

  test('teachers are blocked from student-only endpoints (403)', async () => {
    const res = await assign(teacher, { studentIds: [s1.user.id], experimentId: String(ohm._id), dueDate: FUTURE() });
    const id = res.body.created[0].id;
    expect((await api().patch(`/api/assignments/${id}/status`).set(bearer(teacher.token)).send({ status: 'submitted' })).status).toBe(403);
  });

  test('teacher can list students and filter by grade/section/name', async () => {
    const all = await api().get('/api/users/students').set(bearer(teacher.token));
    expect(all.status).toBe(200);
    const mine = all.body.students.filter((s) => [s1.user.id, s2.user.id].includes(s.id));
    expect(mine).toHaveLength(2);
    expect(all.body.students.every((s) => s.role === 'student' && s.passwordHash === undefined)).toBe(true);
    const b = await api().get('/api/users/students?grade=9&section=b').set(bearer(teacher.token));
    expect(b.body.students.some((s) => s.id === s2.user.id)).toBe(true);
    expect(b.body.students.some((s) => s.id === s1.user.id)).toBe(false);
  });
});

describe('assignments', () => {
  test('teacher assigns an experiment to several students and notifications are created', async () => {
    const res = await assign(teacher, { studentIds: [s1.user.id, s2.user.id], experimentId: String(ohm._id), dueDate: FUTURE(), instructions: 'Take 5 readings' });
    expect(res.status).toBe(201);
    expect(res.body.created).toHaveLength(2);
    expect(res.body.created[0]).toMatchObject({ status: 'assigned', instructions: 'Take 5 readings' });
    expect(await Notification.countDocuments({ type: 'assignment', user: s1.user.id })).toBe(1);
  });

  test('re-assigning the same experiment to the same student is skipped (409 when nothing new)', async () => {
    await assign(teacher, { studentIds: [s1.user.id], experimentId: String(ohm._id), dueDate: FUTURE() });
    const again = await assign(teacher, { studentIds: [s1.user.id], experimentId: String(ohm._id), dueDate: FUTURE() });
    expect(again.status).toBe(409);
    const mixed = await assign(teacher, { studentIds: [s1.user.id, s2.user.id], experimentId: String(ohm._id), dueDate: FUTURE() });
    expect(mixed.status).toBe(201);
    expect(mixed.body.created).toHaveLength(1);
    expect(mixed.body.skipped).toHaveLength(1);
  });

  test('validation: past due date, bad ids, empty student list, unknown experiment, teacher id as student', async () => {
    const base = { studentIds: [s1.user.id], experimentId: String(ohm._id), dueDate: FUTURE() };
    expect((await assign(teacher, { ...base, dueDate: '2020-01-01' })).status).toBe(400);
    expect((await assign(teacher, { ...base, studentIds: [] })).status).toBe(400);
    expect((await assign(teacher, { ...base, studentIds: ['nope'] })).status).toBe(400);
    expect((await assign(teacher, { ...base, experimentId: '64b7f0c2a1b2c3d4e5f60718' })).status).toBe(404);
    expect((await assign(teacher, { ...base, studentIds: [teacher2.user.id] })).status).toBe(409); // not a student -> nothing created
  });

  test('students only see their own assignments; teachers only see ones they created', async () => {
    await assign(teacher, { studentIds: [s1.user.id], experimentId: String(ohm._id), dueDate: FUTURE() });
    await assign(teacher2, { studentIds: [s2.user.id], experimentId: String(cell._id), dueDate: FUTURE() });

    const a = await api().get('/api/assignments').set(bearer(s1.token));
    expect(a.body.assignments).toHaveLength(1);
    expect(a.body.assignments[0].student).toBe(s1.user.id);
    expect(a.body.assignments[0].experiment.title).toBe("Ohm's Law");
    expect(a.body.assignments[0].teacher.name).toBe(teacher.user.name);

    // a student cannot widen the scope with ?student=<other id>
    const widen = await api().get(`/api/assignments?student=${s2.user.id}`).set(bearer(s1.token));
    expect(widen.body.assignments).toHaveLength(1);

    const t1 = await api().get('/api/assignments').set(bearer(teacher.token));
    const t2 = await api().get('/api/assignments').set(bearer(teacher2.token));
    expect(t1.body.assignments).toHaveLength(1);
    expect(t2.body.assignments).toHaveLength(1);
    expect(t1.body.assignments[0].student.name).toBe(s1.user.name);
  });

  test("a student cannot read, update or submit another student's assignment (404)", async () => {
    const res = await assign(teacher, { studentIds: [s1.user.id], experimentId: String(ohm._id), dueDate: FUTURE() });
    const id = res.body.created[0].id;
    expect((await api().get(`/api/assignments/${id}`).set(bearer(s2.token))).status).toBe(404);
    expect((await api().patch(`/api/assignments/${id}/status`).set(bearer(s2.token)).send({ status: 'submitted' })).status).toBe(404);
    expect((await api().get(`/api/assignments/${id}`).set(bearer(s1.token))).status).toBe(200);
  });

  test("a teacher cannot read, edit, review or delete another teacher's assignment (404)", async () => {
    const res = await assign(teacher, { studentIds: [s1.user.id], experimentId: String(ohm._id), dueDate: FUTURE() });
    const id = res.body.created[0].id;
    expect((await api().get(`/api/assignments/${id}`).set(bearer(teacher2.token))).status).toBe(404);
    expect((await api().patch(`/api/assignments/${id}`).set(bearer(teacher2.token)).send({ instructions: 'hack' })).status).toBe(404);
    expect((await api().post(`/api/assignments/${id}/review`).set(bearer(teacher2.token)).send({ feedback: 'x' })).status).toBe(404);
    expect((await api().delete(`/api/assignments/${id}`).set(bearer(teacher2.token))).status).toBe(404);
  });

  test('full lifecycle: assigned -> in_progress -> submitted -> reviewed with notifications', async () => {
    const res = await assign(teacher, { studentIds: [s1.user.id], experimentId: String(ohm._id), dueDate: FUTURE() });
    const id = res.body.created[0].id;
    const st = (status) => api().patch(`/api/assignments/${id}/status`).set(bearer(s1.token)).send({ status });

    expect((await st('in_progress')).body.assignment.status).toBe('in_progress');
    expect((await st('in_progress')).status).toBe(409); // cannot repeat
    const sub = await st('submitted');
    expect(sub.body.assignment.status).toBe('submitted');
    expect(sub.body.assignment.submittedAt).toBeTruthy();
    expect(await Notification.countDocuments({ user: teacher.user.id, type: 'submission' })).toBe(1);

    expect((await st('in_progress')).status).toBe(409); // cannot go back
    expect((await api().delete(`/api/assignments/${id}`).set(bearer(teacher.token))).status).toBe(409); // submitted: locked

    const rev = await api().post(`/api/assignments/${id}/review`).set(bearer(teacher.token)).send({ feedback: 'Good work', marks: 17 });
    expect(rev.body.assignment).toMatchObject({ status: 'reviewed', feedback: 'Good work', marks: 17 });
    expect(await Notification.countDocuments({ user: s1.user.id, type: 'feedback' })).toBe(1);
    expect((await api().post(`/api/assignments/${id}/review`).set(bearer(teacher.token)).send({ feedback: 'again' })).status).toBe(409);
  });

  test('students cannot set status "reviewed" or send arbitrary statuses', async () => {
    const res = await assign(teacher, { studentIds: [s1.user.id], experimentId: String(ohm._id), dueDate: FUTURE() });
    const id = res.body.created[0].id;
    for (const status of ['reviewed', 'assigned', 'hacked']) {
      expect((await api().patch(`/api/assignments/${id}/status`).set(bearer(s1.token)).send({ status })).status).toBe(400);
    }
  });

  test('review is only possible after submission; marks must be 0-100', async () => {
    const res = await assign(teacher, { studentIds: [s1.user.id], experimentId: String(ohm._id), dueDate: FUTURE() });
    const id = res.body.created[0].id;
    expect((await api().post(`/api/assignments/${id}/review`).set(bearer(teacher.token)).send({ feedback: 'early' })).status).toBe(409);
    expect((await api().post(`/api/assignments/${id}/review`).set(bearer(teacher.token)).send({ feedback: 'x', marks: 500 })).status).toBe(400);
  });

  test('teacher can update the due date, filter by status and delete an unstarted assignment', async () => {
    const res = await assign(teacher, { studentIds: [s1.user.id, s2.user.id], experimentId: String(ohm._id), dueDate: FUTURE() });
    const [a, b] = res.body.created;
    const newDue = new Date(Date.now() + 10 * 86400000).toISOString();
    const upd = await api().patch(`/api/assignments/${a.id}`).set(bearer(teacher.token)).send({ dueDate: newDue });
    expect(new Date(upd.body.assignment.dueDate).toISOString()).toBe(newDue);
    expect((await api().patch(`/api/assignments/${a.id}`).set(bearer(teacher.token)).send({})).status).toBe(400);

    await api().patch(`/api/assignments/${b.id}/status`).set(bearer(s2.token)).send({ status: 'in_progress' });
    const filtered = await api().get('/api/assignments?status=in_progress').set(bearer(teacher.token));
    expect(filtered.body.assignments).toHaveLength(1);

    expect((await api().delete(`/api/assignments/${a.id}`).set(bearer(teacher.token))).status).toBe(200);
    expect(await Assignment.countDocuments()).toBe(1);
  });

  test('invalid assignment ids return 400, not a server error', async () => {
    expect((await api().get('/api/assignments/not-an-id').set(bearer(s1.token))).status).toBe(400);
  });
});
