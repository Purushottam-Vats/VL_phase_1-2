const { connect, disconnect, api, registerUser, bearer } = require('./helpers');
const { runSeed } = require('../seed');
const { Experiment, Subject, User, Assignment } = require('../models');

let student;
beforeAll(async () => {
  await connect();
  await runSeed({ reset: true, quiet: true });
  student = await registerUser();
});
afterAll(disconnect);

describe('seed', () => {
  test('creates the expected data', async () => {
    expect(await Subject.countDocuments()).toBe(3);
    expect(await Experiment.countDocuments()).toBe(9);
    expect(await User.countDocuments({ role: 'teacher' })).toBe(2);
    expect(await User.countDocuments({ role: 'student' })).toBe(8 + 1); // 8 seeded + the one registered above
    expect(await Assignment.countDocuments()).toBe(10);
  });

  test('is idempotent (running twice does not duplicate anything)', async () => {
    const before = await runSeed({ quiet: true });
    const after = await runSeed({ quiet: true });
    expect(after).toEqual(before);
  });

  test('every experiment has 3 languages, a quiz and rural context', async () => {
    const all = await Experiment.find();
    for (const e of all) {
      expect(e.content.en.steps.length).toBeGreaterThan(3);
      expect(e.content.kn.title).toBeTruthy();
      expect(e.content.hi.title).toBeTruthy();
      expect(e.content.en.ruralContext).toBeTruthy();
      expect(e.quiz.length).toBeGreaterThanOrEqual(3);
    }
  });

  test('seeded demo accounts can log in', async () => {
    expect((await api().post('/api/auth/login').send({ email: 'teacher1@example.com', password: 'Teacher@123' })).status).toBe(200);
    expect((await api().post('/api/auth/login').send({ email: 'student1@example.com', password: 'Student@123' })).status).toBe(200);
  });
});

describe('GET /api/subjects', () => {
  test('requires authentication', async () => {
    expect((await api().get('/api/subjects')).status).toBe(401);
  });
  test('returns the three subjects with experiment counts, localised', async () => {
    const en = await api().get('/api/subjects').set(bearer(student.token));
    expect(en.body.subjects.map((s) => s.key)).toEqual(['physics', 'chemistry', 'biology']);
    expect(en.body.subjects.every((s) => s.experimentCount === 3)).toBe(true);
    const kn = await api().get('/api/subjects?lang=kn').set(bearer(student.token));
    expect(kn.body.subjects[0].name).toBe('ಭೌತಶಾಸ್ತ್ರ');
  });
});

describe('GET /api/experiments', () => {
  const get = (qs = '') => api().get(`/api/experiments${qs}`).set(bearer(student.token));

  test('requires authentication', async () => {
    expect((await api().get('/api/experiments')).status).toBe(401);
  });
  test('lists all 9 experiments', async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.body.pagination.total).toBe(9);
  });
  test.each(['physics', 'chemistry', 'biology'])('filters by subject %s', async (key) => {
    const res = await get(`?subject=${key}`);
    expect(res.body.experiments).toHaveLength(3);
    expect(res.body.experiments.every((e) => e.subject.key === key)).toBe(true);
  });
  test('filters by difficulty', async () => {
    const res = await get('?difficulty=intermediate');
    expect(res.body.experiments.length).toBeGreaterThan(0);
    expect(res.body.experiments.every((e) => e.difficulty === 'intermediate')).toBe(true);
  });
  test('searches by title and by tag, case-insensitively', async () => {
    expect((await get('?q=OHM')).body.experiments[0].slug).toBe('ohms-law');
    expect((await get('?q=chlorophyll')).body.experiments[0].slug).toBe('photosynthesis');
  });
  test('search input is regex-escaped (no crash, no wildcard match)', async () => {
    const res = await get(`?q=${encodeURIComponent('.*(')}`);
    expect(res.status).toBe(200);
    expect(res.body.experiments).toHaveLength(0);
  });
  test('paginates', async () => {
    const res = await get('?limit=4&page=3');
    expect(res.body.experiments).toHaveLength(1);
    expect(res.body.pagination).toMatchObject({ total: 9, pages: 3, page: 3 });
  });
  test('unknown subject yields an empty list; invalid params yield 400', async () => {
    expect((await get('?subject=astronomy')).body.experiments).toHaveLength(0);
    expect((await get('?lang=fr')).status).toBe(400);
    expect((await get('?limit=1000')).status).toBe(400);
  });
});

describe('GET /api/experiments/:idOrSlug', () => {
  const get = (id, qs = '') => api().get(`/api/experiments/${id}${qs}`).set(bearer(student.token));

  test('returns full English content by slug', async () => {
    const res = await get('ohms-law');
    expect(res.status).toBe(200);
    const e = res.body.experiment;
    expect(e.content.title).toBe("Ohm's Law");
    expect(e.content.steps.length).toBeGreaterThan(3);
    expect(e.quiz).toHaveLength(3);
    expect(e.simulationKey).toBe('physics/ohms-law');
    expect(e.languages).toEqual(['en', 'kn', 'hi']);
  });
  test('also works by ObjectId', async () => {
    const exp = await Experiment.findOne({ slug: 'photosynthesis' });
    expect((await get(String(exp._id))).body.experiment.slug).toBe('photosynthesis');
  });
  test('serves Kannada/Hindi text and falls back to English for untranslated fields', async () => {
    const kn = (await get('ohms-law', '?lang=kn')).body.experiment;
    expect(kn.content.title).toBe('ಓಮ್ ನಿಯಮ');
    expect(kn.content.steps.length).toBeGreaterThan(3); // English fallback
    const hi = (await get('ohms-law', '?lang=hi')).body.experiment;
    expect(hi.content.title).toBe('ओम का नियम');
  });
  test('404 for an unknown experiment', async () => {
    expect((await get('does-not-exist')).status).toBe(404);
  });
  test('unpublished experiments are hidden', async () => {
    await Experiment.updateOne({ slug: 'simple-pendulum' }, { isPublished: false });
    expect((await get('simple-pendulum')).status).toBe(404);
    expect((await get('', '?subject=physics')).body.experiments).toHaveLength(2);
    await Experiment.updateOne({ slug: 'simple-pendulum' }, { isPublished: true });
  });
});
