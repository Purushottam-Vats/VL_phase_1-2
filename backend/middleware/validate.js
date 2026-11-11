// validate({ body, query, params }) - parses with zod and replaces the request parts with the cleaned result.
module.exports = (schemas) => (req, _res, next) => {
  try {
    for (const part of ['params', 'query', 'body']) {
      if (schemas[part]) req[part] = schemas[part].parse(req[part] || {});
    }
    next();
  } catch (err) {
    next(err); // ZodError is converted to a 400 by errorHandler
  }
};
