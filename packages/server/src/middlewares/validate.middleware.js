/**
 * Universal validation middleware using Zod schemas
 * @param {z.ZodSchema} schema - Zod validation schema
 * @param {string} source - Data source: 'body', 'params', 'query' (default: 'body')
 * @returns {Function} Express middleware function
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      // Get data from specified source
      const data = req[source];

      // Validate data against the provided schema
      const validatedData = schema.parse(data);

      // Data Sanitization
      // Mutate the original object to maintain compatibility with Express 5
      // where req.query is a read-only getter and cannot be re-assigned.
      Object.keys(req[source]).forEach((key) => delete req[source][key]);
      Object.assign(req[source], validatedData);

      next();
    } catch (error) {
      // Pass raw error to global error handler for formatting
      next(error);
    }
  };
};

export default validate;
