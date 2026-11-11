const express = require('express');
const AuthController = require('../controllers/AuthController');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { loginSchema } = require('../validators/auth.validator');

const router = express.Router();

// POST /api/auth/login
router.post('/login', validate(loginSchema), (req, res, next) =>
  AuthController.login(req, res, next)
);

// POST /api/auth/logout
router.post('/logout', authenticate, (req, res, next) =>
  AuthController.logout(req, res, next)
);

// GET /api/auth/me
router.get('/me', authenticate, (req, res, next) =>
  AuthController.getMe(req, res, next)
);

module.exports = router;

