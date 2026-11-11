const { z } = require('zod');
const { objectId, pagination } = require('./common');

const create = z.object({
  studentIds: z.array(objectId).min(1, 'Select at least one student').max(100),
  experimentId: objectId,
  dueDate: z.coerce.date({ invalid_type_error: 'Invalid due date' }).refine((d) => d.getTime() > Date.now(), 'Due date must be in the future'),
  instructions: z.string().trim().max(500).optional(),
});

const update = z
  .object({
    dueDate: z.coerce.date().refine((d) => d.getTime() > Date.now(), 'Due date must be in the future'),
    instructions: z.string().trim().max(500),
  })
  .partial()
  .refine((o) => Object.keys(o).length > 0, 'Nothing to update');

const studentStatus = z.object({ status: z.enum(['in_progress', 'submitted']) });

const review = z.object({
  feedback: z.string().trim().min(1, 'Feedback is required').max(1000),
  marks: z.coerce.number().min(0).max(100).optional(),
});

const list = z.object({
  status: z.enum(['assigned', 'in_progress', 'submitted', 'reviewed']).optional(),
  student: objectId.optional(),
  experiment: objectId.optional(),
  lang: z.enum(['en', 'kn', 'hi']).default('en'),
  ...pagination,
});

module.exports = { create, update, studentStatus, review, list };
