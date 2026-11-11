const { sendError } = require('../utils/response');
const RoleRepository = require('../repositories/RoleRepository');

/**
 * Dynamic RBAC Permission Middleware
 * Dynamically evaluates database-stored role permissions at request time.
 * Changes made to role permissions take effect immediately without server restart.
 * 
 * @param {string} module - System module name (dashboard, alarm, event, map, api, user, role, settings, audit)
 * @param {'read' | 'create' | 'update' | 'delete'} action - Permission action
 */
const requirePermission = (module, action) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return sendError(
          res,
          'Authentication required before authorization check',
          401,
          'UNAUTHORIZED'
        );
      }

      const roleId = req.user.roleId?._id || req.user.roleId;

      if (!roleId) {
        return sendError(
          res,
          'User does not have an assigned role',
          403,
          'FORBIDDEN'
        );
      }

      // Dynamically load the latest role permissions from the database
      const role = await RoleRepository.findById(roleId);

      if (!role) {
        return sendError(
          res,
          'The assigned role was not found in the database',
          403,
          'ROLE_NOT_FOUND'
        );
      }

      // System Administrator retains full administrative bypass
      if (role.name === 'ADMIN') {
        req.userRole = role;
        return next();
      }

      // Check dynamic module permissions
      const modulePermissions = role.permissions?.[module];
      let hasPermission = Boolean(modulePermissions?.[action]);

      // Fallback compatibility for user/role modules to api permissions
      if (!hasPermission && (module === 'user' || module === 'role')) {
        hasPermission = Boolean(role.permissions?.api?.[action]);
      }

      if (!hasPermission) {
        return sendError(
          res,
          `Access denied. Role [${role.name}] lacks [${module}:${action}] permission.`,
          403,
          'FORBIDDEN',
          { requiredModule: module, requiredAction: action, role: role.name }
        );
      }

      req.userRole = role;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Strict Administrator-Only Middleware
 */
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
    }

    const roleId = req.user.roleId?._id || req.user.roleId;
    const role = await RoleRepository.findById(roleId);

    if (!role || role.name !== 'ADMIN') {
      return sendError(
        res,
        'Access denied: This operation is strictly reserved for System Administrators.',
        403,
        'ADMIN_REQUIRED'
      );
    }

    req.userRole = role;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requirePermission,
  requireAdmin
};
