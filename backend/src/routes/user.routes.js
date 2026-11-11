const express = require('express');
const UserController = require('../controllers/UserController');
const authenticate = require('../middleware/auth.middleware');
const { requireAdmin, requirePermission } = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');
const {
  createUserSchema,
  updateUserSchema,
  updateUserStatusSchema
} = require('../validators/auth.validator');

const router = express.Router();

// Apply authentication to all user routes
router.use(authenticate);

// POST /api/users - Create user (Admin only)
router.post('/', requireAdmin, validate(createUserSchema), (req, res, next) =>
  UserController.createUser(req, res, next)
);

// GET /api/users - List users (Admin or users with api:read permission)
router.get('/', requirePermission('api', 'read'), (req, res, next) =>
  UserController.getUsers(req, res, next)
);

// GET /api/users/:id - Get user by ID (Admin or users with api:read permission)
router.get('/:id', requirePermission('api', 'read'), (req, res, next) =>
  UserController.getUserById(req, res, next)
);

// PUT /api/users/:id - Update user (Admin only)
router.put('/:id', requireAdmin, validate(updateUserSchema), (req, res, next) =>
  UserController.updateUser(req, res, next)
);

// PATCH /api/users/:id/status - Activate/Deactivate user (Admin only)
router.patch('/:id/status', requireAdmin, validate(updateUserStatusSchema), (req, res, next) =>
  UserController.updateUserStatus(req, res, next)
);

module.exports = router;
