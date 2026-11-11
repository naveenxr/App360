/**
 * Base Repository
 * Encapsulates common Mongoose operations without domain logic.
 */
class BaseRepository {
  /**
   * @param {import('mongoose').Model} model - Mongoose Model
   */
  constructor(model) {
    if (!model) {
      throw new Error('BaseRepository requires a valid Mongoose model.');
    }
    this.model = model;
  }

  async findById(id, projection = null, options = {}) {
    return await this.model.findById(id, projection, options);
  }

  async findOne(filter = {}, projection = null, options = {}) {
    return await this.model.findOne(filter, projection, options);
  }

  async findAll(filter = {}, projection = null, options = {}) {
    return await this.model.find(filter, projection, options);
  }

  async create(data) {
    return await this.model.create(data);
  }

  async update(id, data, options = { new: true, runValidators: true }) {
    return await this.model.findByIdAndUpdate(id, data, options);
  }

  async delete(id) {
    return await this.model.findByIdAndDelete(id);
  }

  async count(filter = {}) {
    return await this.model.countDocuments(filter);
  }

  async exists(filter = {}) {
    return await this.model.exists(filter);
  }
}

module.exports = BaseRepository;

