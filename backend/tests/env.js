// Runs before every test file (jest setupFiles). Must set env BEFORE the app/config is required.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-1234';
process.env.TEACHER_INVITE_CODE = 'TEST-INVITE-2026';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';
