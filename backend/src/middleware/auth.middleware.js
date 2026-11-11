const { verifyToken } = require('../utils/jwt');
const { sendError } = require('../utils/response');
const UserRepository = require('../repositories/UserRepository');

/**
 * Authentication Middleware
 * Validates Bearer JWT in Authorization header, checks database user active status,
 * and attaches verified user object to req.user.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(
        res,
        'Authentication required. No Bearer token provided.',
        401,
        'UNAUTHORIZED'
      );
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      const isExpired = err.name === 'TokenExpiredError';
      return sendError(
        res,
        isExpired ? 'Authentication token has expired' : 'Invalid authentication token',
        401,
        isExpired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN'
      );
    }

    if (!decoded || !decoded.id) {
      return sendError(res, 'Malformed token payload', 401, 'INVALID_TOKEN');
    }

    // Load active user from database
    const user = await UserRepository.findById(decoded.id);

    if (!user) {
      return sendError(res, 'User associated with this token no longer exists', 401, 'USER_NOT_FOUND');
    }

    if (!user.isActive) {
      return sendError(res, 'Your user account has been deactivated. Please contact an administrator.', 401, 'ACCOUNT_DEACTIVATED');
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = authenticate;
