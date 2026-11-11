const UserService = require('../services/UserService');
const { sendSuccess } = require('../utils/response');

class UserController {
  async getUsers(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 50;

      const filter = {};
      if (req.query.search) {
        filter.$or = [
          { name: { $regex: req.query.search, $options: 'i' } },
          { email: { $regex: req.query.search, $options: 'i' } }
        ];
      }

      const result = await UserService.listUsers(filter, { page, limit });
      return sendSuccess(res, result.users, 'Users retrieved successfully', 200, {
        page: result.page,
        limit,
        total: result.total,
        totalPages: result.totalPages
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req, res, next) {
    try {
      const user = await UserService.getUserById(req.params.id);
      return sendSuccess(res, user, 'User retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  async createUser(req, res, next) {
    try {
      const user = await UserService.createUser(req.body);
      return sendSuccess(res, user, 'User created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async updateUser(req, res, next) {
    try {
      const user = await UserService.updateUser(req.params.id, req.body);
      return sendSuccess(res, user, 'User updated successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  async updateUserStatus(req, res, next) {
    try {
      const { isActive } = req.body;
      const user = await UserService.updateUserStatus(req.params.id, isActive);
      const actionName = isActive ? 'activated' : 'deactivated';
      return sendSuccess(res, user, `User account ${actionName} successfully`, 200);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();

