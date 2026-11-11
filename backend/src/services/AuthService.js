const UserRepository = require('../repositories/UserRepository');
const { signToken } = require('../utils/jwt');

class AuthService {
  /**
   * Authenticate user credentials and issue JWT
   * @param {string} email 
   * @param {string} password 
   * @returns {Promise<Object>} Authentication result
   */
  async login(email, password) {
    const user = await UserRepository.findByEmailWithPassword(email);

    if (!user) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    if (!user.isActive) {
      const error = new Error('Account has been deactivated. Please contact an administrator.');
      error.statusCode = 403;
      error.code = 'ACCOUNT_DEACTIVATED';
      throw error;
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    // Generate JWT
    const token = signToken({
      id: user._id.toString(),
      email: user.email
    });

    const userObj = user.toJSON();

    return {
      token,
      user: {
        id: userObj.id,
        name: userObj.name,
        email: userObj.email,
        isActive: userObj.isActive,
        role: user.roleId
      }
    };
  }

  /**
   * Get current authenticated user details
   * @param {string} userId 
   * @returns {Promise<Object>} User details with role
   */
  async getCurrentUser(userId) {
    const user = await UserRepository.findById(userId);

    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    return user;
  }
}

module.exports = new AuthService();
