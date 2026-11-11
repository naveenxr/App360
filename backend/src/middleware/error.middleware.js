const { sendError } = require('../utils/response');
const { ZodError } = require('zod');

const errorHandler = (err, req, res, next) => {
  // Log unexpected errors
  if (process.env.NODE_ENV !== 'test') {
    console.error(`❌ [Error Handler] ${req.method} ${req.url}:`, err);
  }

  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message
    }));
    return sendError(res, 'Validation failed', 422, 'VALIDATION_ERROR', formattedErrors);
  }

  // Handle JSON Syntax Error in Body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return sendError(res, 'Malformed JSON payload', 400, 'BAD_REQUEST');
  }

  // Handle CORS policy rejections cleanly
  if (typeof err.message === 'string' && err.message.includes('not allowed by CORS policy')) {
    return sendError(res, err.message, 403, 'CORS_FORBIDDEN');
  }

  // Custom App / Operational Errors
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const code = err.code || 'INTERNAL_ERROR';
  const details = err.details || null;

  return sendError(res, message, statusCode, code, details);
};

module.exports = errorHandler;

