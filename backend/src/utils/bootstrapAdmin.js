const bcrypt = require('bcryptjs');
const config = require('../config/env');
const UserRepository = require('../repositories/UserRepository');
const RoleRepository = require('../repositories/RoleRepository');

/**
 * Bootstraps the initial system administrator if not already present.
 * Uses credentials configured in environment variables.
 * Never hardcodes plain-text credentials.
 */
const bootstrapAdmin = async () => {
  const adminEmail = (process.env.ADMIN_EMAIL || config.ADMIN_EMAIL).toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || config.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME || config.ADMIN_NAME;

  if (!adminEmail || !adminPassword) {
    console.warn('⚠️ ADMIN_EMAIL or ADMIN_PASSWORD not configured. Skipping admin bootstrap.');
    return null;
  }

  // Ensure ADMIN role exists
  const adminRole = await RoleRepository.findByName('ADMIN');
  if (!adminRole) {
    throw new Error('ADMIN role does not exist. Please run role seeding first.');
  }

  // Check if admin user already exists
  const existingAdmin = await UserRepository.findByEmail(adminEmail);
  if (existingAdmin) {
    return {
      status: 'exists',
      user: existingAdmin
    };
  }

  // Hash password with configured salt rounds
  const passwordHash = await bcrypt.hash(adminPassword, config.BCRYPT_SALT_ROUNDS);

  // Create administrator
  const newAdmin = await UserRepository.create({
    name: adminName,
    email: adminEmail,
    passwordHash,
    roleId: adminRole._id,
    isActive: true
  });

  console.log(`👑 Initial System Administrator bootstrapped: [${newAdmin.email}]`);

  return {
    status: 'created',
    user: newAdmin
  };
};

module.exports = bootstrapAdmin;
