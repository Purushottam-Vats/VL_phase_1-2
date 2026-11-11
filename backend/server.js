const env = require('./config/env');
const { connectDB } = require('./config/db');
const app = require('./app');

async function start() {
  try {
    await connectDB();
    const host = env.MONGODB_URI.replace(/\/\/[^@/]*@/, '//***@'); // never log credentials
    console.log(`[db] connected to ${host}`);
  } catch (err) {
    console.error('\n[db] Could not connect to MongoDB:', err.message);
    console.error('     Is MongoDB running, and is MONGODB_URI in backend/.env correct?');
    console.error('     See README.md > "MongoDB setup".\n');
    process.exit(1);
  }

  const server = app.listen(env.PORT, () => {
    console.log(`[api] Virtual Lab API running on http://localhost:${env.PORT}/api  (${env.NODE_ENV})`);
  });

  const shutdown = () => {
    console.log('\n[api] shutting down...');
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();
