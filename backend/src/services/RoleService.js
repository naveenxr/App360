const RoleRepository = require('../repositories/RoleRepository');
const UserRepository = require('../repositories/UserRepository');
const AuditLogService = require('./AuditLogService');
const { MODULE_LIST } = require('../utils/seedRoles');

class RoleService {
  async listRoles() {
    const roles = await RoleRepository.listRoles();

    // Aggregate assigned user counts per role
    const counts = await UserRepository.model.aggregate([
      { $group: { _id: '$roleId', count: { $sum: 1 } } }
    ]);

    const countMap = {};
    counts.forEach((c) => {
      if (c._id) {
        countMap[c._id.toString()] = c.count;
      }
    });

    return roles.map((r) => {
      const obj = r.toJSON();
      obj.assignedUserCount = countMap[r._id.toString()] || 0;
      return obj;
    });
  }

  async getRoleById(id) {
    const role = await RoleRepository.findById(id);
    if (!role) {
      const error = new Error(`Role with ID [${id}] not found`);
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    const assignedUserCount = await UserRepository.model.countDocuments({ roleId: role._id });
    const obj = role.toJSON();
    obj.assignedUserCount = assignedUserCount;
    return obj;
  }

  async createRole(roleData, actorUser = null, req = null) {
    const roleName = String(roleData.name).toUpperCase().trim();
    const existing = await RoleRepository.findByName(roleName);
    if (existing) {
      const error = new Error(`Role with name [${roleName}] already exists`);
      error.statusCode = 409;
      error.code = 'CONFLICT';
      throw error;
    }

    // Provision complete 9-module permissions
    const permissions = roleData.permissions || {};
    for (const mod of MODULE_LIST) {
      if (!permissions[mod]) {
        permissions[mod] = { read: false, create: false, update: false, delete: false };
      }
    }

    const newRole = await RoleRepository.create({
      name: roleName,
      description: roleData.description || '',
      permissions,
      isSystemRole: false
    });

    if (actorUser) {
      await AuditLogService.recordLog({
        actor: actorUser,
        action: 'ROLE_CREATED',
        targetType: 'ROLE',
        targetId: newRole._id,
        targetName: newRole.name,
        previousValues: null,
        updatedValues: { name: newRole.name, description: newRole.description },
        req
      });
    }

    return newRole;
  }

  async updateRole(id, updateData, actorUser = null, req = null) {
    const role = await RoleRepository.findById(id);
    if (!role) {
      const error = new Error(`Role with ID [${id}] not found`);
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    const previousValues = {
      name: role.name,
      description: role.description,
      permissions: role.permissions
    };

    const updates = {};
    if (updateData.name && updateData.name.toUpperCase().trim() !== role.name) {
      if (role.isSystemRole) {
        const error = new Error(`System-critical role [${role.name}] cannot be renamed`);
        error.statusCode = 400;
        error.code = 'SYSTEM_ROLE_PROTECTED';
        throw error;
      }

      const existing = await RoleRepository.findByName(updateData.name);
      if (existing && existing._id.toString() !== id) {
        const error = new Error(`Role with name [${updateData.name}] already exists`);
        error.statusCode = 409;
        error.code = 'CONFLICT';
        throw error;
      }
      updates.name = updateData.name.toUpperCase().trim();
    }

    if (typeof updateData.description !== 'undefined') {
      updates.description = updateData.description;
    }

    if (updateData.permissions) {
      updates.permissions = updateData.permissions;
    }

    const updatedRole = await RoleRepository.update(id, updates);

    if (actorUser) {
      await AuditLogService.recordLog({
        actor: actorUser,
        action: updateData.permissions ? 'PERMISSION_CHANGED' : 'ROLE_UPDATED',
        targetType: 'ROLE',
        targetId: id,
        targetName: role.name,
        previousValues,
        updatedValues: updates,
        req
      });
    }

    return updatedRole;
  }

  async updateRolePermissions(roleId, permissions, actorUser = null, req = null) {
    const role = await RoleRepository.findById(roleId);
    if (!role) {
      const error = new Error(`Role with ID [${roleId}] not found`);
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    const previousPerms = role.permissions;
    const updatedRole = await RoleRepository.updatePermissions(roleId, permissions);

    if (actorUser) {
      await AuditLogService.recordLog({
        actor: actorUser,
        action: 'PERMISSION_CHANGED',
        targetType: 'ROLE',
        targetId: roleId,
        targetName: role.name,
        previousValues: { permissions: previousPerms },
        updatedValues: { permissions },
        req
      });
    }

    return updatedRole;
  }

  async deleteRole(id, actorUser = null, req = null) {
    const role = await RoleRepository.findById(id);
    if (!role) {
      const error = new Error(`Role with ID [${id}] not found`);
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    if (role.isSystemRole) {
      const error = new Error(`System-critical role [${role.name}] cannot be deleted`);
      error.statusCode = 400;
      error.code = 'SYSTEM_ROLE_PROTECTED';
      throw error;
    }

    const assignedCount = await UserRepository.model.countDocuments({ roleId: id });
    if (assignedCount > 0) {
      const error = new Error(`Cannot delete role [${role.name}]: ${assignedCount} active users are currently assigned to this role`);
      error.statusCode = 400;
      error.code = 'ROLE_IN_USE';
      throw error;
    }

    await RoleRepository.delete(id);

    if (actorUser) {
      await AuditLogService.recordLog({
        actor: actorUser,
        action: 'ROLE_UPDATED',
        targetType: 'ROLE',
        targetId: id,
        targetName: role.name,
        previousValues: { name: role.name, description: role.description },
        updatedValues: { deleted: true },
        req
      });
    }

    return { deleted: true, roleName: role.name };
  }

  async getPermissionsMatrix() {
    const roles = await this.listRoles();

    // Query all registered users from MongoDB and map them to their assigned role
    const users = await UserRepository.model.find({}, 'name email roleId isActive createdAt').lean();
    const usersByRoleId = {};
    users.forEach((u) => {
      const rId = u.roleId ? u.roleId.toString() : '';
      if (!usersByRoleId[rId]) usersByRoleId[rId] = [];
      usersByRoleId[rId].push({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        isActive: u.isActive,
        createdAt: u.createdAt
      });
    });

    const enrichedRoles = roles.map((r) => {
      const roleIdStr = (r.id || r._id).toString();
      return {
        ...r,
        assignedUsers: usersByRoleId[roleIdStr] || []
      };
    });

    return {
      modules: MODULE_LIST,
      actions: ['create', 'read', 'update', 'delete'],
      roles: enrichedRoles,
      users: users.map((u) => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        roleId: u.roleId ? u.roleId.toString() : null,
        isActive: u.isActive
      }))
    };
  }
}

module.exports = new RoleService();
