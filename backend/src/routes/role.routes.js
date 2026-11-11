const express = require('express');
const RoleController = require('../controllers/RoleController');
const authenticate = require('../middleware/auth.middleware');
const { requireAdmin, requirePermission } = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');
const {
  updatePermissionsSchema,
  createRoleSchema
} = require('../validators/auth.validator');

const router = express.Router();

// Apply authentication to all role routes
router.use(authenticate);

// GET /api/roles - List all roles with assigned user counts (Admin or users with role:read / api:read)
router.get('/', requirePermission('role', 'read'), (req, res, next) =>
  RoleController.getRoles(req, res, next)
);

// GET /api/roles/matrix - Permissions matrix
router.get('/matrix', requirePermission('role', 'read'), (req, res, next) =>
  RoleController.getPermissionsMatrix(req, res, next)
);

// GET /api/roles/:id - Get role by ID
router.get('/:id', requirePermission('role', 'read'), (req, res, next) =>
  RoleController.getRoleById(req, res, next)
);

// POST /api/roles - Create new custom role (Admin only)
router.post('/', requireAdmin, validate(createRoleSchema), (req, res, next) =>
  RoleController.createRole(req, res, next)
);

// PUT /api/roles/:id - Update custom role details (Admin only)
router.put('/:id', requireAdmin, (req, res, next) =>
  RoleController.updateRole(req, res, next)
);

// PUT /api/roles/:id/permissions - Dynamically update role permissions (Admin only)
router.put('/:id/permissions', requireAdmin, validate(updatePermissionsSchema), (req, res, next) =>
  RoleController.updateRolePermissions(req, res, next)
);

// DELETE /api/roles/:id - Delete custom role (Admin only)
router.delete('/:id', requireAdmin, (req, res, next) =>
  RoleController.deleteRole(req, res, next)
);

module.exports = router;
