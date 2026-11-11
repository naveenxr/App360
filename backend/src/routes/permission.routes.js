const express = require('express');
const RoleController = require('../controllers/RoleController');
const authenticate = require('../middleware/auth.middleware');
const { requireAdmin, requirePermission } = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');
const { updatePermissionsSchema } = require('../validators/auth.validator');

const router = express.Router();

router.use(authenticate);

// GET /api/permissions - Retrieve complete permissions matrix across all modules and roles
router.get('/', requirePermission('role', 'read'), (req, res, next) =>
  RoleController.getPermissionsMatrix(req, res, next)
);

// PUT /api/permissions/:roleId - Update permissions for specific role
router.put('/:id', requireAdmin, validate(updatePermissionsSchema), (req, res, next) =>
  RoleController.updateRolePermissions(req, res, next)
);

module.exports = router;
