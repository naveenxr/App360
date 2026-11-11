const BaseRepository = require('./BaseRepository');
const Role = require('../models/Role');

class RoleRepository extends BaseRepository {
  constructor() {
    super(Role);
  }

  async findByName(name) {
    return await this.model.findOne({ name: name.toUpperCase() });
  }

  async listRoles(filter = {}) {
    return await this.model.find(filter).sort({ createdAt: 1 });
  }

  async updatePermissions(roleId, permissions) {
    return await this.model.findByIdAndUpdate(
      roleId,
      { $set: { permissions } },
      { new: true, runValidators: true }
    );
  }
}

module.exports = new RoleRepository();

