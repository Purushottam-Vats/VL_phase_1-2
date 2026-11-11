const router = require('express').Router();
const mongoose = require('mongoose');

router.get('/health', (_req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({ success: true, status: 'ok', database: states[mongoose.connection.readyState] || 'unknown', time: new Date().toISOString() });
});

router.use('/auth', require('./authRoutes'));
router.use('/subjects', require('./subjectRoutes'));
router.use('/experiments', require('./experimentRoutes'));
router.use('/users', require('./userRoutes'));
router.use('/assignments', require('./assignmentRoutes'));

module.exports = router;
