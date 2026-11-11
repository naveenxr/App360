const UserService = require('../services/UserService');
const { sendSuccess } = require('../utils/response');

class UserController {
  async getUsers(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 50;

      const filters = {
        search: req.query.search,
        roleId: req.query.roleId,
        isActive: req.query.isActive
      };

      const result = await UserService.listUsers(filters, { page, limit });
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
      const user = await UserService.createUser(req.body, req.user, req);
      return sendSuccess(res, user, 'User created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async updateUser(req, res, next) {
    try {
      const user = await UserService.updateUser(req.params.id, req.body, req.user, req);
      return sendSuccess(res, user, 'User updated successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  async updateUserStatus(req, res, next) {
    try {
      const { isActive } = req.body;
      const user = await UserService.updateUserStatus(req.params.id, isActive, req.user, req);
      const actionName = isActive ? 'activated' : 'deactivated';
      return sendSuccess(res, user, `User account ${actionName} successfully`, 200);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();
