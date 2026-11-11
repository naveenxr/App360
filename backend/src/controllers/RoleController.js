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

  async createRole(req, res, next) {
    try {
      const role = await RoleService.createRole(req.body, req.user, req);
      return sendSuccess(res, role, 'Role created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async updateRole(req, res, next) {
    try {
      const role = await RoleService.updateRole(req.params.id, req.body, req.user, req);
      return sendSuccess(res, role, 'Role updated successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  async updateRolePermissions(req, res, next) {
    try {
      const { permissions } = req.body;
      const role = await RoleService.updateRolePermissions(req.params.id, permissions, req.user, req);
      return sendSuccess(res, role, 'Role permissions updated successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  async deleteRole(req, res, next) {
    try {
      const result = await RoleService.deleteRole(req.params.id, req.user, req);
      return sendSuccess(res, result, 'Role deleted successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  async getPermissionsMatrix(req, res, next) {
    try {
      const matrix = await RoleService.getPermissionsMatrix();
      return sendSuccess(res, matrix, 'Permissions matrix retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new RoleController();
