const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { User } = require('../models');
const { connect, disconnect, clearAll, api, registerUser, bearer } = require('./helpers');

beforeAll(connect);
afterAll(disconnect);
beforeEach(clearAll);

const valid = { name: 'Ananya R', email: 'ananya@example.com', password: 'Secret123', role: 'student', grade: '9', section: 'a' };

describe('POST /api/auth/register', () => {
  test('registers a student, returns a JWT and never exposes the password hash', async () => {
    const res = await api().post('/api/auth/register').send(valid);
    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ name: 'Ananya R', email: 'ananya@example.com', role: 'student', grade: '9', section: 'A', preferredLanguage: 'en' });
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toMatch(/\$2[aby]\$/);
  });

  test('stores a bcrypt hash, not the plain password', async () => {
    await api().post('/api/auth/register').send(valid);
    const u = await User.findOne({ email: valid.email }).select('+passwordHash');
    expect(u.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(u.passwordHash).not.toContain('Secret123');
  });

  test('normalises email to lower case and rejects duplicates (409)', async () => {
    await api().post('/api/auth/register').send(valid);
    const res = await api().post('/api/auth/register').send({ ...valid, email: 'ANANYA@Example.com' });
    expect(res.status).toBe(409);
  });

  test.each([
    ['short password', { password: 'abc1' }],
    ['password without a number', { password: 'onlyletters' }],
    ['password without a letter', { password: '12345678' }],
    ['invalid email', { email: 'not-an-email' }],
    ['missing name', { name: '' }],
    ['unknown role', { role: 'admin' }],
    ['invalid grade', { grade: '99' }],
    ['invalid language', { preferredLanguage: 'fr' }],
  ])('rejects %s with 400', async (_label, patch) => {
    const res = await api().post('/api/auth/register').send({ ...valid, ...patch });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(Array.isArray(res.body.details)).toBe(true);
  });

  test('ignores mass-assignment attempts (isActive, _id, passwordHash)', async () => {
    const res = await api().post('/api/auth/register').send({ ...valid, isActive: false, _id: '64b7f0c2a1b2c3d4e5f60718', passwordHash: 'x' });
    expect(res.status).toBe(201);
    expect(res.body.user.isActive).toBe(true);
    expect(res.body.user.id).not.toBe('64b7f0c2a1b2c3d4e5f60718');
  });

  test('teacher registration needs the correct invite code', async () => {
    const t = { ...valid, email: 'teacher@example.com', role: 'teacher' };
    expect((await api().post('/api/auth/register').send(t)).status).toBe(403);
    expect((await api().post('/api/auth/register').send({ ...t, inviteCode: 'WRONG' })).status).toBe(403);
    const ok = await api().post('/api/auth/register').send({ ...t, inviteCode: env.TEACHER_INVITE_CODE });
    expect(ok.status).toBe(201);
    expect(ok.body.user.role).toBe('teacher');
  });

  test('teacher registration is disabled when no invite code is configured', async () => {
    const saved = env.TEACHER_INVITE_CODE;
    env.TEACHER_INVITE_CODE = '';
    try {
      const res = await api().post('/api/auth/register').send({ ...valid, email: 't2@example.com', role: 'teacher', inviteCode: 'anything' });
      expect(res.status).toBe(403);
    } finally {
      env.TEACHER_INVITE_CODE = saved;
    }
  });

  test('rejects malformed JSON with 400', async () => {
    const res = await api().post('/api/auth/register').set('Content-Type', 'application/json').send('{"name": ');
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => { await api().post('/api/auth/register').send(valid); });

  test('logs in with correct credentials (case-insensitive email)', async () => {
    const res = await api().post('/api/auth/login').send({ email: 'Ananya@example.com', password: 'Secret123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.email).toBe('ananya@example.com');
    const decoded = jwt.decode(res.body.token);
    expect(decoded.role).toBe('student');
    expect(decoded.exp).toBeGreaterThan(decoded.iat);
  });

  test('wrong password and unknown email give the same 401 message', async () => {
    const bad = await api().post('/api/auth/login').send({ email: valid.email, password: 'Wrong12345' });
    const unknown = await api().post('/api/auth/login').send({ email: 'nobody@example.com', password: 'Secret123' });
    expect(bad.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(bad.body.message).toBe(unknown.body.message);
  });

  test('rejects missing fields and non-string values (NoSQL-injection attempt)', async () => {
    expect((await api().post('/api/auth/login').send({ email: valid.email })).status).toBe(400);
    const inj = await api().post('/api/auth/login').send({ email: { $ne: null }, password: { $ne: null } });
    expect(inj.status).toBe(400);
  });

  test('a disabled account cannot log in', async () => {
    await User.updateOne({ email: valid.email }, { isActive: false });
    const res = await api().post('/api/auth/login').send({ email: valid.email, password: 'Secret123' });
    expect(res.status).toBe(403);
  });
});

describe('JWT authentication middleware', () => {
  test('GET /me requires a token', async () => {
    expect((await api().get('/api/auth/me')).status).toBe(401);
  });

  test('GET /me rejects garbage, wrong-secret and expired tokens', async () => {
    const { user } = await registerUser();
    expect((await api().get('/api/auth/me').set(bearer('garbage'))).status).toBe(401);
    const forged = jwt.sign({ role: 'teacher' }, 'another-secret-another-secret-123456', { subject: user.id });
    expect((await api().get('/api/auth/me').set(bearer(forged))).status).toBe(401);
    const expired = jwt.sign({ role: 'student' }, env.JWT_SECRET, { subject: user.id, expiresIn: -10 });
    expect((await api().get('/api/auth/me').set(bearer(expired))).status).toBe(401);
  });

  test('rejects tokens signed with the "none" algorithm', async () => {
    const { user } = await registerUser();
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const none = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: user.id, role: 'student' })}.`;
    expect((await api().get('/api/auth/me').set(bearer(none))).status).toBe(401);
  });

  test('GET /me returns the current user for a valid token', async () => {
    const { token, user } = await registerUser();
    const res = await api().get('/api/auth/me').set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(user.id);
  });

  test('a deactivated or deleted user is locked out immediately', async () => {
    const a = await registerUser();
    await User.updateOne({ _id: a.user.id }, { isActive: false });
    expect((await api().get('/api/auth/me').set(bearer(a.token))).status).toBe(401);
    const b = await registerUser();
    await User.deleteOne({ _id: b.user.id });
    expect((await api().get('/api/auth/me').set(bearer(b.token))).status).toBe(401);
  });

  test('the role comes from the database, not the token claim', async () => {
    const s = await registerUser();
    const lying = jwt.sign({ role: 'teacher' }, env.JWT_SECRET, { subject: s.user.id });
    const res = await api().get('/api/users/students').set(bearer(lying));
    expect(res.status).toBe(403);
  });
});

describe('profile and password', () => {
  test('PATCH /me updates allowed fields only', async () => {
    const { token } = await registerUser();
    const res = await api().patch('/api/auth/me').set(bearer(token)).send({ name: 'New Name', preferredLanguage: 'hi', role: 'teacher', email: 'x@y.com' });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ name: 'New Name', preferredLanguage: 'hi', role: 'student' });
    expect(res.body.user.email).not.toBe('x@y.com');
  });

  test('change-password needs the current password and then the new one works', async () => {
    const { token, email } = await registerUser();
    const bad = await api().post('/api/auth/change-password').set(bearer(token)).send({ currentPassword: 'nope12345', newPassword: 'Brandnew99' });
    expect(bad.status).toBe(400);
    const ok = await api().post('/api/auth/change-password').set(bearer(token)).send({ currentPassword: 'Passw0rd!', newPassword: 'Brandnew99' });
    expect(ok.status).toBe(200);
    expect((await api().post('/api/auth/login').send({ email, password: 'Passw0rd!' })).status).toBe(401);
    expect((await api().post('/api/auth/login').send({ email, password: 'Brandnew99' })).status).toBe(200);
  });
});

describe('misc', () => {
  test('health endpoint is public', async () => {
    const res = await api().get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.database).toBe('connected');
  });
  test('unknown routes return a JSON 404', async () => {
    const res = await api().get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
