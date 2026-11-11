const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { objectId } = require('../validators/common');
const { z } = require('zod');
const schemas = require('../validators/assignment');
const c = require('../controllers/assignmentController');

const idParam = { params: z.object({ id: objectId }) };

router.use(authenticate);

router.get('/', validate({ query: schemas.list }), c.list);
router.get('/:id', validate({ ...idParam, query: z.object({ lang: z.enum(['en', 'kn', 'hi']).default('en') }) }), c.getOne);

// Teacher-only
router.post('/', authorize('teacher'), validate({ body: schemas.create }), c.create);
router.patch('/:id', authorize('teacher'), validate({ ...idParam, body: schemas.update }), c.update);
router.post('/:id/review', authorize('teacher'), validate({ ...idParam, body: schemas.review }), c.review);
router.delete('/:id', authorize('teacher'), validate(idParam), c.remove);

// Student-only
router.patch('/:id/status', authorize('student'), validate({ ...idParam, body: schemas.studentStatus }), c.updateStatus);

module.exports = router;
