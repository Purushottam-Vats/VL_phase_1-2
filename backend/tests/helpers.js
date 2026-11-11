const mongoose = require('mongoose');
const request = require('supertest');
const models = require('../models');
const app = require('../app');

let memoryServer = null;

// Uses TEST_MONGODB_URI when provided (any MongoDB-compatible server); otherwise starts an in-memory
// MongoDB with mongodb-memory-server. Every test file gets its own throw-away database, and the real
// development database (MONGODB_URI) is never touched.
async function connect() {
  const dbName = `vl_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  let uri;
  if (process.env.TEST_MONGODB_URI) {
    uri = process.env.TEST_MONGODB_URI.replace(/\/+$/, '');
  } else {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri().replace(/\/+$/, '');
  }
  await mongoose.connect(uri, { dbName });
  await Promise.all(Object.values(models).map((m) => m.init()));
}

async function disconnect() {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
  if (memoryServer) await memoryServer.stop();
}

async function clearAll() {
  await Promise.all(Object.values(models).map((m) => m.deleteMany({})));
}

const api = () => request(app);

let counter = 0;
async function registerUser(overrides = {}) {
  counter += 1;
  const body = {
    name: `Test User ${counter}`,
    email: `user${counter}_${Date.now()}@example.com`,
    password: 'Passw0rd!',
    role: 'student',
    grade: '9',
    section: 'A',
    ...overrides,
  };
  if (body.role === 'teacher' && body.inviteCode === undefined) body.inviteCode = process.env.TEACHER_INVITE_CODE;
  const res = await api().post('/api/auth/register').send(body);
  if (res.status !== 201) throw new Error(`registerUser failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { token: res.body.token, user: res.body.user, email: body.email, password: body.password };
}

const bearer = (token) => ({ Authorization: `Bearer ${token}` });

module.exports = { connect, disconnect, clearAll, api, registerUser, bearer };
