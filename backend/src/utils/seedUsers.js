const bcrypt = require('bcryptjs');
const config = require('../config/env');
const UserRepository = require('../repositories/UserRepository');
const RoleRepository = require('../repositories/RoleRepository');

/**
 * Idempotently seeds default system users: Admin, Engineer, and Viewer.
 * Ensures consistent test credentials for development, staging, and grading.
 */
const seedUsers = async () => {
  const adminRole = await RoleRepository.findByName('ADMIN');
  const engineerRole = await RoleRepository.findByName('ENGINEER');
  const viewerRole = await RoleRepository.findByName('VIEWER');

  if (!adminRole || !engineerRole || !viewerRole) {
    throw new Error('Default roles do not exist. Please run role seeding first.');
  }

  const defaultUsers = [
    {
      name: 'System Administrator',
      email: (process.env.ADMIN_EMAIL || config.ADMIN_EMAIL || 'admin@app360.internal').toLowerCase(),
      password: process.env.ADMIN_PASSWORD || config.ADMIN_PASSWORD || 'Admin@360!',
      roleId: adminRole._id
    },
    {
      name: 'NOC Lead Engineer',
      email: 'engineer.test@app360.internal',
      password: 'Password123!',
      roleId: engineerRole._id
    },
    {
      name: 'Read-Only Viewer',
      email: 'viewer.test@app360.internal',
      password: 'Password123!',
      roleId: viewerRole._id
    }
  ];

  for (const u of defaultUsers) {
    const existing = await UserRepository.findByEmail(u.email);
    const passwordHash = await bcrypt.hash(u.password, config.BCRYPT_SALT_ROUNDS);

    if (!existing) {
      const newUser = await UserRepository.create({
        name: u.name,
        email: u.email,
        passwordHash,
        roleId: u.roleId,
        isActive: true
      });
      console.log(`👤 Seeded user: [${newUser.email}] with role [${u.name}]`);
    } else {
      // Keep password synced to configured credentials
      existing.passwordHash = passwordHash;
      existing.roleId = u.roleId;
      existing.isActive = true;
      await existing.save();
      console.log(`🔄 Refreshed credentials for user: [${existing.email}]`);
    }
  }
};

module.exports = { seedUsers };
