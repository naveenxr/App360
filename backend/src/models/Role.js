const mongoose = require('mongoose');

const actionPermissionsSchema = new mongoose.Schema(
  {
    read: { type: Boolean, default: false },
    create: { type: Boolean, default: false },
    update: { type: Boolean, default: false },
    delete: { type: Boolean, default: false }
  },
  { _id: false }
);

const modulePermissionsSchema = new mongoose.Schema(
  {
    alarm: {
      type: actionPermissionsSchema,
      default: () => ({ read: false, create: false, update: false, delete: false })
    },
    map: {
      type: actionPermissionsSchema,
      default: () => ({ read: false, create: false, update: false, delete: false })
    },
    api: {
      type: actionPermissionsSchema,
      default: () => ({ read: false, create: false, update: false, delete: false })
    }
  },
  { _id: false }
);

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Role name is required'],
      unique: true,
      uppercase: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    permissions: {
      type: modulePermissionsSchema,
      required: true,
      default: () => ({
        alarm: { read: false, create: false, update: false, delete: false },
        map: { read: false, create: false, update: false, delete: false },
        api: { read: false, create: false, update: false, delete: false }
      })
    },
    isSystemRole: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

const Role = mongoose.models.Role || mongoose.model('Role', roleSchema);

module.exports = Role;
