const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const schemas = require('../validators/user');
const c = require('../controllers/userController');

// Teacher-only
router.get('/students', authenticate, authorize('teacher'), validate({ query: schemas.listStudents }), c.listStudents);

module.exports = router;
