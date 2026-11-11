const RoleService = require('../services/RoleService');
const { sendSuccess } = require('../utils/response');

class RoleController {
  async getRoles(req, res, next) {
    try {
      const roles = await RoleService.listRoles();
      return sendSuccess(res, roles, 'Roles retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  async getRoleById(req, res, next) {
    try {
      const role = await RoleService.getRoleById(req.params.id);
      return sendSuccess(res, role, 'Role retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  async updateRolePermissions(req, res, next) {
    try {
      const { permissions } = req.body;
      const role = await RoleService.updateRolePermissions(req.params.id, permissions);
      return sendSuccess(res, role, 'Role permissions updated successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  async createRole(req, res, next) {
    try {
      const role = await RoleService.createRole(req.body);
      return sendSuccess(res, role, 'Role created successfully', 201);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new RoleController();
