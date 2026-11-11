const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().trim().email('A valid email address is required'),
  password: z.string().min(1, 'Password is required')
});

const createUserSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().email('A valid email address is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  roleId: z.string().trim().min(1, 'Role ID is required')
});

const updateUserSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100).optional(),
  email: z.string().trim().email('A valid email address is required').optional(),
  roleId: z.string().trim().min(1, 'Role ID must be valid').optional()
});

const updateUserStatusSchema = z.object({
  isActive: z.boolean({ required_error: 'isActive status boolean is required' })
});

const actionsSchema = z.object({
  read: z.boolean().default(false),
  create: z.boolean().default(false),
  update: z.boolean().default(false),
  delete: z.boolean().default(false)
});

const updatePermissionsSchema = z.object({
  permissions: z.object({
    alarm: actionsSchema,
    map: actionsSchema,
    api: actionsSchema
  })
});

const createRoleSchema = z.object({
  name: z.string().trim().min(2, 'Role name must be at least 2 characters').toUpperCase(),
  description: z.string().optional().default(''),
  permissions: z.object({
    alarm: actionsSchema,
    map: actionsSchema,
    api: actionsSchema
  })
});

module.exports = {
  loginSchema,
  createUserSchema,
  updateUserSchema,
  updateUserStatusSchema,
  updatePermissionsSchema,
  createRoleSchema
};
