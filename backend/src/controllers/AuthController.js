const AuthService = require('../services/AuthService');
const { sendSuccess } = require('../utils/response');

class AuthController {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);

      return sendSuccess(res, result, 'Login successful', 200);
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      // For stateless JWT, client deletes token from storage.
      return sendSuccess(res, null, 'Logged out successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  async getMe(req, res, next) {
    try {
      const user = await AuthService.getCurrentUser(req.user._id);
      return sendSuccess(res, user, 'Current user profile fetched successfully', 200);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();

