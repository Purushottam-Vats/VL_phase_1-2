const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const c = require('../controllers/subjectController');

router.get('/', authenticate, c.list);

module.exports = router;
