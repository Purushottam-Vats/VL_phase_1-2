const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const schemas = require('../validators/experiment');
const c = require('../controllers/experimentController');

router.get('/', authenticate, validate({ query: schemas.list }), c.list);
router.get('/:idOrSlug', authenticate, validate({ query: schemas.detail }), c.getOne);

module.exports = router;
