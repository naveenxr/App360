const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    actorName: {
      type: String,
      required: true,
      trim: true
    },
    actorEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    action: {
      type: String,
      required: true,
      enum: [
        'USER_CREATED',
        'USER_UPDATED',
        'USER_ACTIVATED',
        'USER_DEACTIVATED',
        'ROLE_ASSIGNED',
        'ROLE_CREATED',
        'ROLE_UPDATED',
        'PERMISSION_CHANGED'
      ],
      index: true
    },
    targetType: {
      type: String,
      enum: ['USER', 'ROLE', 'PERMISSION'],
      required: true,
      index: true
    },
    targetId: {
      type: String,
      default: null
    },
    targetName: {
      type: String,
      default: ''
    },
    previousValues: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    updatedValues: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    ipAddress: {
      type: String,
      default: null
    },
    userAgent: {
      type: String,
      default: null
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: false,
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

auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });

const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;

