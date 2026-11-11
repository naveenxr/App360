const bcrypt = require('bcryptjs');
const UserRepository = require('../repositories/UserRepository');
const RoleRepository = require('../repositories/RoleRepository');
const config = require('../config/env');

class UserService {
  async listUsers(filter = {}, options = {}) {
    return await UserRepository.listUsers(filter, options);
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

  async createUser({ name, email, password, roleId }) {
    // Check if user with this email already exists
    const existing = await UserRepository.findByEmail(email);
    if (existing) {
      const error = new Error(`User with email [${email}] already exists`);
      error.statusCode = 409;
      error.code = 'CONFLICT';
      throw error;
    }

    // Verify role exists (can be passed as role ObjectId or role name string like 'ENGINEER')
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

    const user = await UserRepository.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      roleId: resolvedRole._id,
      isActive: true
    });

    return await UserRepository.findById(user._id);
  }

  async updateUser(id, updateData) {
    const user = await UserRepository.findById(id);
    if (!user) {
      const error = new Error(`User with ID [${id}] not found`);
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    const updates = {};
    if (updateData.name) updates.name = updateData.name;
    if (updateData.email) {
      const existing = await UserRepository.findByEmail(updateData.email);
      if (existing && existing._id.toString() !== id) {
        const error = new Error(`Email [${updateData.email}] is already taken`);
        error.statusCode = 409;
        error.code = 'CONFLICT';
        throw error;
      }
      updates.email = updateData.email.toLowerCase();
    }

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
      updates.roleId = resolvedRole._id;
    }

    await UserRepository.update(id, updates);
    return await UserRepository.findById(id);
  }

  async updateUserStatus(id, isActive) {
    const user = await UserRepository.findById(id);
    if (!user) {
      const error = new Error(`User with ID [${id}] not found`);
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    return await UserRepository.update(id, { isActive });
  }
}

module.exports = new UserService();
