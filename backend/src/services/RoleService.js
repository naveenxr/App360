const RoleRepository = require('../repositories/RoleRepository');

class RoleService {
  async listRoles() {
    return await RoleRepository.listRoles();
  }

  async getRoleById(id) {
    const role = await RoleRepository.findById(id);
    if (!role) {
      const error = new Error(`Role with ID [${id}] not found`);
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }
    return role;
  }

  async updateRolePermissions(roleId, permissions) {
    const role = await RoleRepository.findById(roleId);
    if (!role) {
      const error = new Error(`Role with ID [${roleId}] not found`);
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    return await RoleRepository.updatePermissions(roleId, permissions);
  }

  async createRole(roleData) {
    const existing = await RoleRepository.findByName(roleData.name);
    if (existing) {
      const error = new Error(`Role with name [${roleData.name}] already exists`);
      error.statusCode = 409;
      error.code = 'CONFLICT';
      throw error;
    }

    return await RoleRepository.create({
      ...roleData,
      isSystemRole: false
    });
  }
}

module.exports = new RoleService();

