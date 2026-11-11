const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const schemas = require('../validators/auth');
const c = require('../controllers/authController');

const limiter = env.RATE_LIMIT_ENABLED
  ? rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: env.AUTH_RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, message: 'Too many attempts. Please try again in a few minutes.' },
    })
  : (_req, _res, next) => next();

router.post('/register', limiter, validate({ body: schemas.register }), c.register);
router.post('/login', limiter, validate({ body: schemas.login }), c.login);
router.get('/me', authenticate, c.me);
router.patch('/me', authenticate, validate({ body: schemas.updateProfile }), c.updateMe);
router.post('/change-password', authenticate, validate({ body: schemas.changePassword }), c.changePassword);

module.exports = router;
