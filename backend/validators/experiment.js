const { z } = require('zod');
const { language, pagination } = require('./common');

const list = z.object({
  subject: z.string().trim().max(50).optional(), // subject key (physics) or id
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  q: z.string().trim().max(80).optional(),
  lang: language.default('en'),
  ...pagination,
});

const detail = z.object({ lang: language.default('en') });

module.exports = { list, detail };
