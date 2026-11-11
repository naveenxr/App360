const bcrypt = require('bcryptjs');
const UserRepository = require('../repositories/UserRepository');
const RoleRepository = require('../repositories/RoleRepository');
const AuditLogService = require('./AuditLogService');
const config = require('../config/env');

class UserService {
  async listUsers(queryFilters = {}, options = {}) {
    const filter = {};

    if (queryFilters.search) {
      const searchRegex = { $regex: queryFilters.search.trim(), $options: 'i' };
      filter.$or = [{ name: searchRegex }, { email: searchRegex }];
    }

    if (queryFilters.roleId) {
      filter.roleId = queryFilters.roleId;
    }

    if (typeof queryFilters.isActive !== 'undefined') {
      filter.isActive = queryFilters.isActive === 'true' || queryFilters.isActive === true;
    }

    const page = parseInt(options.page, 10) || 1;
    const limit = parseInt(options.limit, 10) || 50;
    const sort = options.sort || { createdAt: -1 };

    return await UserRepository.listUsers(filter, { page, limit, sort });
  }

  async getUserById(id) {
    const user = await UserRepository.findById(id);
    if (!user) {
      const error = new Error(`User with ID [${id}] not found`);
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }
    return user;
  }

  async createUser(userData, actorUser = null, req = null) {
    const { name, email, password, roleId } = userData;

    // Check if user with this email already exists
    const existing = await UserRepository.findByEmail(email);
    if (existing) {
      const error = new Error(`User with email [${email}] already exists`);
      error.statusCode = 409;
      error.code = 'CONFLICT';
      throw error;
    }

    // Verify role exists
    let resolvedRole = null;
    if (roleId.match(/^[0-9a-fA-F]{24}$/)) {
      resolvedRole = await RoleRepository.findById(roleId);
    } else {
      resolvedRole = await RoleRepository.findByName(roleId);
    }

    if (!resolvedRole) {
      const error = new Error(`Role [${roleId}] does not exist`);
      error.statusCode = 400;
      error.code = 'INVALID_ROLE';
      throw error;
    }

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(password, config.BCRYPT_SALT_ROUNDS);

    const newUser = await UserRepository.create({
      name,
      email: email.toLowerCase().trim(),
      passwordHash,
      roleId: resolvedRole._id,
      isActive: true
    });

    const userWithRole = await UserRepository.findById(newUser._id);

    // Audit Event: USER_CREATED
    if (actorUser) {
      await AuditLogService.recordLog({
        actor: actorUser,
        action: 'USER_CREATED',
        targetType: 'USER',
        targetId: newUser._id,
        targetName: newUser.name,
        previousValues: null,
        updatedValues: {
          name: newUser.name,
          email: newUser.email,
          role: resolvedRole.name,
          isActive: true
        },
        req
      });
    }

    return userWithRole;
  }

  async updateUser(id, updateData, actorUser = null, req = null) {
    const user = await UserRepository.findById(id);
    if (!user) {
      const error = new Error(`User with ID [${id}] not found`);
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    const previousValues = {
      name: user.name,
      email: user.email,
      roleId: user.roleId?._id?.toString() || user.roleId?.toString(),
      roleName: user.roleId?.name || '',
      isActive: user.isActive
    };

    const updates = {};
    if (updateData.name) {
      updates.name = updateData.name.trim();
    }

    if (updateData.email && updateData.email.toLowerCase().trim() !== user.email) {
      const existing = await UserRepository.findByEmail(updateData.email);
      if (existing && existing._id.toString() !== id) {
        const error = new Error(`Email [${updateData.email}] is already taken`);
        error.statusCode = 409;
        error.code = 'CONFLICT';
        throw error;
      }
      updates.email = updateData.email.toLowerCase().trim();
    }

    let roleChanged = false;
    let newRoleDoc = null;

    if (updateData.roleId) {
      let resolvedRole = null;
      if (updateData.roleId.match(/^[0-9a-fA-F]{24}$/)) {
        resolvedRole = await RoleRepository.findById(updateData.roleId);
      } else {
        resolvedRole = await RoleRepository.findByName(updateData.roleId);
      }

      if (!resolvedRole) {
        const error = new Error(`Role [${updateData.roleId}] does not exist`);
        error.statusCode = 400;
        error.code = 'INVALID_ROLE';
        throw error;
      }

      const currentRoleId = user.roleId?._id?.toString() || user.roleId?.toString();
      if (currentRoleId !== resolvedRole._id.toString()) {
        roleChanged = true;
        newRoleDoc = resolvedRole;

        // Security check: If target user is an ADMIN, check if they are the last active admin
        if (user.roleId?.name === 'ADMIN' && resolvedRole.name !== 'ADMIN') {
          const adminRole = await RoleRepository.findByName('ADMIN');
          if (adminRole) {
            const activeAdminCount = await UserRepository.model.countDocuments({
              roleId: adminRole._id,
              isActive: true
            });
            if (activeAdminCount <= 1) {
              const error = new Error('Cannot change role of the last active System Administrator');
              error.statusCode = 400;
              error.code = 'CANNOT_DEMOTE_LAST_ADMIN';
              throw error;
            }
          }
        }

        updates.roleId = resolvedRole._id;
      }
    }

    // Optional password update if provided
    if (updateData.password && updateData.password.trim().length >= 6) {
      updates.passwordHash = await bcrypt.hash(updateData.password.trim(), config.BCRYPT_SALT_ROUNDS);
    }

    await UserRepository.update(id, updates);
    const updatedUser = await UserRepository.findById(id);

    // Audit Event: USER_UPDATED and/or ROLE_ASSIGNED
    if (actorUser) {
      if (roleChanged && newRoleDoc) {
        await AuditLogService.recordLog({
          actor: actorUser,
          action: 'ROLE_ASSIGNED',
          targetType: 'USER',
          targetId: id,
          targetName: updatedUser.name,
          previousValues: { role: previousValues.roleName },
          updatedValues: { role: newRoleDoc.name },
          req
        });
      }

      await AuditLogService.recordLog({
        actor: actorUser,
        action: 'USER_UPDATED',
        targetType: 'USER',
        targetId: id,
        targetName: updatedUser.name,
        previousValues,
        updatedValues: {
          name: updatedUser.name,
          email: updatedUser.email,
          roleId: updatedUser.roleId?._id,
          roleName: updatedUser.roleId?.name
        },
        req
      });
    }

    return updatedUser;
  }

  async updateUserStatus(id, isActive, actorUser = null, req = null) {
    const user = await UserRepository.findById(id);
    if (!user) {
      const error = new Error(`User with ID [${id}] not found`);
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    // Security check: Prevent deactivation of the last active administrator
    if (!isActive && user.roleId?.name === 'ADMIN' && user.isActive) {
      const adminRole = await RoleRepository.findByName('ADMIN');
      if (adminRole) {
        const activeAdminCount = await UserRepository.model.countDocuments({
          roleId: adminRole._id,
          isActive: true
        });

        if (activeAdminCount <= 1) {
          const error = new Error('Security Restriction: Cannot deactivate the last active System Administrator');
          error.statusCode = 400;
          error.code = 'CANNOT_DEACTIVATE_LAST_ADMIN';
          throw error;
        }
      }
    }

    const previousStatus = user.isActive;
    await UserRepository.update(id, { isActive });
    const updatedUser = await UserRepository.findById(id);

    // Audit Event: USER_ACTIVATED / USER_DEACTIVATED
    if (actorUser) {
      const actionName = isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED';
      await AuditLogService.recordLog({
        actor: actorUser,
        action: actionName,
        targetType: 'USER',
        targetId: id,
        targetName: updatedUser.name,
        previousValues: { isActive: previousStatus },
        updatedValues: { isActive },
        req
      });
    }

    return updatedUser;
  }
}

module.exports = new UserService();
