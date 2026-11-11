const RoleRepository = require('../repositories/RoleRepository');

const DEFAULT_ROLES = [
  {
    name: 'ADMIN',
    description: 'System Administrator with full access to all system modules',
    isSystemRole: true,
    permissions: {
      alarm: { read: true, create: true, update: true, delete: true },
      map: { read: true, create: true, update: true, delete: true },
      api: { read: true, create: true, update: true, delete: true }
    }
  },
  {
    name: 'ENGINEER',
    description: 'Network Operations Engineer with operational access to alarms and maps',
    isSystemRole: true,
    permissions: {
      alarm: { read: true, create: false, update: true, delete: false },
      map: { read: true, create: false, update: false, delete: false },
      api: { read: true, create: false, update: false, delete: false }
    }
  },
  {
    name: 'VIEWER',
    description: 'Read-only observer with access to view dashboards and topologies',
    isSystemRole: true,
    permissions: {
      alarm: { read: true, create: false, update: false, delete: false },
      map: { read: true, create: false, update: false, delete: false },
      api: { read: false, create: false, update: false, delete: false }
    }
  }
];

/**
 * Idempotently seeds default system roles into the database.
 * Does not overwrite existing administrator-customized permissions.
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
      results.existing.push(existingRole.name);
    }
  }

  return results;
};

module.exports = {
  seedRoles,
  DEFAULT_ROLES
};
