const mongoose = require('mongoose');
const { connect, disconnect } = require('./helpers');
const { Experiment, Subject, ExperimentProgress, PracticalRecord, User } = require('../models');

beforeAll(connect);
afterAll(disconnect);

describe('schema rules', () => {
  test('User: email is unique and passwordHash is excluded from queries by default', async () => {
    await User.create({ name: 'Unique One', email: 'u1@example.com', passwordHash: 'h', role: 'student' });
    await expect(User.create({ name: 'Unique Two', email: 'U1@example.com', passwordHash: 'h', role: 'student' })).rejects.toThrow(/duplicate|E11000/i);
    const found = await User.findOne({ email: 'u1@example.com' });
    expect(found.passwordHash).toBeUndefined();
  });

  test('User: invalid role / grade are rejected', async () => {
    await expect(User.create({ name: 'Bad Role', email: 'b@example.com', passwordHash: 'h', role: 'admin' })).rejects.toThrow();
    await expect(User.create({ name: 'Bad Grade', email: 'g@example.com', passwordHash: 'h', role: 'student', grade: '15' })).rejects.toThrow();
  });

  test('Experiment: English content and valid quiz answers are required', async () => {
    const subject = await Subject.create({ key: 'test-subject', name: { en: 'Test' } });
    const base = { slug: 'x-1', subject: subject._id, topic: 'T', simulationKey: 'k' };
    await expect(Experiment.create({ ...base, content: { en: { title: 'Only title' } } })).rejects.toThrow(/English/);
    const good = { en: { title: 'T', objective: 'O', introduction: 'I', steps: ['s'] } };
    await expect(Experiment.create({ ...base, slug: 'x-2', content: good, quiz: [{ question: 'q', options: ['a', 'b'], correctIndex: 5 }] })).rejects.toThrow(/correctIndex/);
    const ok = await Experiment.create({ ...base, slug: 'x-3', content: good });
    expect(ok.difficulty).toBe('beginner');
    expect(ok.createdAt).toBeInstanceOf(Date);
    expect(ok.updatedAt).toBeInstanceOf(Date);
  });

  test('ExperimentProgress: one document per user+experiment; clientId is unique per user (sync de-duplication)', async () => {
    const user = new mongoose.Types.ObjectId();
    const exp1 = new mongoose.Types.ObjectId();
    const exp2 = new mongoose.Types.ObjectId();
    await ExperimentProgress.create({ user, experiment: exp1, clientId: 'abc' });
    await expect(ExperimentProgress.create({ user, experiment: exp1 })).rejects.toThrow(/duplicate|E11000/i);
    await expect(ExperimentProgress.create({ user, experiment: exp2, clientId: 'abc' })).rejects.toThrow(/duplicate|E11000/i);
    const other = await ExperimentProgress.create({ user: new mongoose.Types.ObjectId(), experiment: exp1, clientId: 'abc' });
    expect(other._id).toBeDefined();
  });

  test('PracticalRecord: clientId defaults to a UUID and is unique per user', async () => {
    const user = new mongoose.Types.ObjectId();
    const experiment = new mongoose.Types.ObjectId();
    const r = await PracticalRecord.create({ user, experiment, title: 'A' });
    expect(r.clientId).toMatch(/^[0-9a-f-]{36}$/);
    await expect(PracticalRecord.create({ user, experiment, title: 'B', clientId: r.clientId })).rejects.toThrow(/duplicate|E11000/i);
  });
});
