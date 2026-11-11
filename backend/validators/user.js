const { z } = require('zod');
const { pagination } = require('./common');

const listStudents = z.object({
  grade: z.enum(['6', '7', '8', '9', '10', '11', '12']).optional(),
  section: z.string().trim().toUpperCase().max(5).optional(),
  q: z.string().trim().max(80).optional(),
  ...pagination,
});

module.exports = { listStudents };
