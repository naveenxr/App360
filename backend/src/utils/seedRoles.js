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
      // Ensure any newly added module permissions exist on the role
      let modified = false;
      const currentPerms = existingRole.permissions || {};

      for (const mod of MODULE_LIST) {
        if (!currentPerms[mod]) {
          currentPerms[mod] = roleDef.permissions[mod] || {
            read: false,
            create: false,
            update: false,
            delete: false
          };
          modified = true;
        }
      }

      if (modified) {
        existingRole.permissions = currentPerms;
        await existingRole.save();
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
