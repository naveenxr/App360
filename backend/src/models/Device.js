const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: [true, 'Device identifier is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    siteId: {
      type: String,
      required: [true, 'Site identifier is required'],
      uppercase: true,
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Device name is required'],
      trim: true
    },
    type: {
      type: String,
      enum: ['ROUTER', 'SWITCH', 'FIREWALL', 'BASE_STATION', 'POWER_SUPPLY'],
      required: [true, 'Device hardware type is required'],
      index: true
    },
    ipAddress: {
      type: String,
      required: [true, 'Management IP address is required'],
      trim: true
    },
    status: {
      type: String,
      enum: ['ONLINE', 'DEGRADED', 'OFFLINE'],
      default: 'ONLINE',
      index: true
    },
    currentSeverity: {
      type: String,
      enum: ['CRITICAL', 'MAJOR', 'MINOR', 'WARNING', 'CLEAR'],
      default: 'CLEAR',
      index: true
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

deviceSchema.index({ siteId: 1, currentSeverity: 1 });
deviceSchema.index({ type: 1, status: 1 });

const Device = mongoose.models.Device || mongoose.model('Device', deviceSchema);

module.exports = Device;

