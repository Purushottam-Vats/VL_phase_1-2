const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const env = require('./config/env');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.disable('x-powered-by');
if (env.isProd) app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    origin: (origin, cb) => {
      // No Origin header = curl/Postman/server-to-server; allow. Browsers must be on the allow-list.
      if (!origin || env.CLIENT_ORIGINS.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
  })
);
app.use(express.json({ limit: '200kb' }));

if (!env.isTest) {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start}ms)`));
    next();
  });
}

app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
