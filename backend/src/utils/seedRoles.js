const RoleRepository = require('../repositories/RoleRepository');

const MODULE_LIST = [
  'dashboard',
  'alarm',
  'event',
  'map',
  'api',
  'user',
  'role',
  'settings',
  'audit'
];

const DEFAULT_ROLES = [
  {
    name: 'ADMIN',
    description: 'System Administrator with full access to all system modules',
    isSystemRole: true,
    permissions: {
      dashboard: { read: true, create: true, update: true, delete: true },
      alarm: { read: true, create: true, update: true, delete: true },
      event: { read: true, create: true, update: true, delete: true },
      map: { read: true, create: true, update: true, delete: true },
      api: { read: true, create: true, update: true, delete: true },
      user: { read: true, create: true, update: true, delete: true },
      role: { read: true, create: true, update: true, delete: true },
      settings: { read: true, create: true, update: true, delete: true },
      audit: { read: true, create: true, update: true, delete: true }
    }
  },
  {
    name: 'ENGINEER',
    description: 'Network Operations Engineer with operational access to alarms and maps',
    isSystemRole: true,
    permissions: {
      dashboard: { read: true, create: false, update: false, delete: false },
      alarm: { read: true, create: false, update: true, delete: false },
      event: { read: true, create: false, update: true, delete: false },
      map: { read: true, create: false, update: false, delete: false },
      api: { read: true, create: false, update: false, delete: false },
      user: { read: false, create: false, update: false, delete: false },
      role: { read: false, create: false, update: false, delete: false },
      settings: { read: true, create: false, update: false, delete: false },
      audit: { read: false, create: false, update: false, delete: false }
    }
  },
  {
    name: 'VIEWER',
    description: 'Read-only observer with access to view dashboards and topologies',
    isSystemRole: true,
    permissions: {
      dashboard: { read: true, create: false, update: false, delete: false },
      alarm: { read: true, create: false, update: false, delete: false },
      event: { read: true, create: false, update: false, delete: false },
      map: { read: true, create: false, update: false, delete: false },
      api: { read: false, create: false, update: false, delete: false },
      user: { read: false, create: false, update: false, delete: false },
      role: { read: false, create: false, update: false, delete: false },
      settings: { read: false, create: false, update: false, delete: false },
      audit: { read: false, create: false, update: false, delete: false }
    }
  }
];

/**
 * Idempotently seeds default system roles into the database.
 * Upgrades existing roles with newly added modules without overwriting customized values.
 * @returns {Promise<Object>} Seed summary
 */
const seedRoles = async () => {
  const results = {
    created: [],
    existing: []
  };

  for (const roleDef of DEFAULT_ROLES) {
    const existingRole = await RoleRepository.findByName(roleDef.name);

    if (!existingRole) {
      const created = await RoleRepository.create(roleDef);
      results.created.push(created.name);
      console.log(`✅ Seeded default role: [${created.name}]`);
    } else {
      // Ensure system roles have the correct full module permissions
      let modified = false;
      const currentPerms = existingRole.toObject ? existingRole.toObject().permissions || {} : existingRole.permissions || {};

      for (const mod of MODULE_LIST) {
        const expectedModPerms = roleDef.permissions[mod] || {
          read: false,
          create: false,
          update: false,
          delete: false
        };

        if (existingRole.name === 'ADMIN') {
          // ADMIN role must always retain full rights on all modules
          if (
            !currentPerms[mod] ||
            !currentPerms[mod].read ||
            !currentPerms[mod].create ||
            !currentPerms[mod].update ||
            !currentPerms[mod].delete
          ) {
            currentPerms[mod] = { read: true, create: true, update: true, delete: true };
            modified = true;
          }
        } else if (!currentPerms[mod] || (
          currentPerms[mod].read === false &&
          currentPerms[mod].create === false &&
          currentPerms[mod].update === false &&
          currentPerms[mod].delete === false &&
          expectedModPerms.read === true
        )) {
          // If the module was just populated with schema defaults (all false) but default role has permissions
          currentPerms[mod] = { ...expectedModPerms };
          modified = true;
        }
      }

      if (modified) {
        existingRole.permissions = currentPerms;
        existingRole.markModified('permissions');
        await existingRole.save();
        console.log(`🔄 Upgraded permissions for system role: [${existingRole.name}]`);
      }

      results.existing.push(existingRole.name);
    }
  }

  return results;
};

module.exports = {
  seedRoles,
  DEFAULT_ROLES,
  MODULE_LIST
};
