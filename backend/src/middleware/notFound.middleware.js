const { sendError } = require('../utils/response');

const notFoundHandler = (req, res, next) => {
  return sendError(
    res,
    `Cannot find ${req.method} ${req.originalUrl} on this server`,
    404,
    'NOT_FOUND'
  );
};

module.exports = notFoundHandler;
