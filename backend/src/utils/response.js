/**
 * Standardized API response formatters
 */

const sendSuccess = (res, data = null, message = 'Success', statusCode = 200, meta = null) => {
  const payload = {
    success: true,
    message,
    ...(data !== null && { data }),
    ...(meta !== null && { meta }),
    timestamp: new Date().toISOString()
  };
  return res.status(statusCode).json(payload);
};

const sendError = (res, message = 'Internal Server Error', statusCode = 500, code = 'INTERNAL_ERROR', details = null) => {
  const payload = {
    success: false,
    error: {
      code,
      message,
      ...(details !== null && { details }),
      timestamp: new Date().toISOString()
    }
  };
  return res.status(statusCode).json(payload);
};

module.exports = {
  sendSuccess,
  sendError
};

