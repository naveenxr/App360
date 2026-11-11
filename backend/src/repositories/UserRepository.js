const BaseRepository = require('./BaseRepository');
const User = require('../models/User');

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  async findByEmail(email) {
    return await this.model
      .findOne({ email: email.toLowerCase() })
      .populate('roleId');
  }

  async findByEmailWithPassword(email) {
    return await this.model
      .findOne({ email: email.toLowerCase() })
      .select('+passwordHash')
      .populate('roleId');
  }

  async findById(id) {
    return await this.model.findById(id).populate('roleId');
  }

  async listUsers(filter = {}, options = {}) {
    const { page = 1, limit = 50, sort = { createdAt: -1 } } = options;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.model
        .find(filter)
        .populate('roleId')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      this.model.countDocuments(filter)
    ]);

    return {
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async deactivateUser(id) {
    return await this.model.findByIdAndUpdate(
      id,
      { $set: { isActive: false } },
      { new: true }
    ).populate('roleId');
  }

  async activateUser(id) {
    return await this.model.findByIdAndUpdate(
      id,
      { $set: { isActive: true } },
      { new: true }
    ).populate('roleId');
  }
}

module.exports = new UserRepository();
