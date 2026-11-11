const { verifyToken } = require('../utils/jwt');
const UserRepository = require('../repositories/UserRepository');
const RoleRepository = require('../repositories/RoleRepository');

/**
 * Socket.IO Handshake Authentication Middleware
 * Validates JWT during the WebSocket handshake, verifies user active status,
 * loads dynamic RBAC role capabilities from MongoDB, and attaches socket.user.
 * Rejects unauthenticated, expired, or deactivated sessions.
 */
const socketAuthMiddleware = async (socket, next) => {
  try {
    // Extract token from socket handshake auth or headers
    let token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;

    if (!token) {
      const error = new Error('Authentication required. No token provided.');
      error.data = { code: 'AUTHENTICATION_REQUIRED' };
      return next(error);
    }

    if (typeof token === 'string' && token.startsWith('Bearer ')) {
      token = token.slice(7).trim();
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      const isExpired = err.name === 'TokenExpiredError';
      const error = new Error(isExpired ? 'Authentication token has expired' : 'Invalid authentication token');
      error.data = { code: isExpired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN' };
      return next(error);
    }

    if (!decoded || !decoded.id) {
      const error = new Error('Malformed token payload');
      error.data = { code: 'INVALID_TOKEN' };
      return next(error);
    }

    // Load active user from database to ensure up-to-date account state
    const user = await UserRepository.findById(decoded.id);

    if (!user) {
      const error = new Error('User associated with this token no longer exists');
      error.data = { code: 'USER_NOT_FOUND' };
      return next(error);
    }

    if (!user.isActive) {
      const error = new Error('Your user account has been deactivated. Please contact an administrator.');
      error.data = { code: 'ACCOUNT_DEACTIVATED' };
      return next(error);
    }

    // Load role and permissions dynamically from database
    const roleId = user.roleId?._id || user.roleId;
    const role = await RoleRepository.findById(roleId);

    if (!role) {
      const error = new Error('The assigned role was not found in the database');
      error.data = { code: 'ROLE_NOT_FOUND' };
      return next(error);
    }

    // Attach authenticated identity to socket instance
    socket.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: role.name,
      roleId: role._id.toString(),
      permissions: role.permissions || {}
    };

    next();
  } catch (error) {
    console.error('💥 Socket authentication error:', error.message);
    const authError = new Error('Internal authentication error');
    authError.data = { code: 'AUTH_INTERNAL_ERROR' };
    next(authError);
  }
};

module.exports = socketAuthMiddleware;
