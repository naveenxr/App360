const mongoose = require('mongoose');

const siteSchema = new mongoose.Schema(
  {
    siteId: {
      type: String,
      required: [true, 'Site identifier is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Site name is required'],
      trim: true
    },
    region: {
      type: String,
      required: [true, 'Region is required'],
      enum: ['North', 'South', 'East', 'West', 'Central'],
      index: true
    },
    coordinates: {
      latitude: {
        type: Number,
        required: [true, 'Latitude is required']
      },
      longitude: {
        type: Number,
        required: [true, 'Longitude is required']
      }
    },
    address: {
      type: String,
      default: '',
      trim: true
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'MAINTENANCE', 'OFFLINE'],
      default: 'ACTIVE',
      index: true
    },
    currentSeverity: {
      type: String,
      enum: ['CRITICAL', 'MAJOR', 'MINOR', 'WARNING', 'CLEAR'],
      default: 'CLEAR',
      index: true
    },
    activeAlarmCount: {
      type: Number,
      default: 0
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

siteSchema.index({ region: 1, currentSeverity: 1 });
siteSchema.index({ 'coordinates.latitude': 1, 'coordinates.longitude': 1 });

const Site = mongoose.models.Site || mongoose.model('Site', siteSchema);

module.exports = Site;
