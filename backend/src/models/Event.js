const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: [true, 'Event identifier is required'],
      unique: true,
      index: true
    },
    siteId: {
      type: String,
      required: [true, 'Site identifier is required'],
      uppercase: true,
      trim: true,
      index: true
    },
    deviceId: {
      type: String,
      required: [true, 'Device identifier is required'],
      uppercase: true,
      trim: true,
      index: true
    },
    alarmIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Alarm'
      }
    ],
    correlationRule: {
      type: String,
      default: 'SAME_SITE_DEVICE_5MIN',
      trim: true
    },
    severity: {
      type: String,
      enum: ['CRITICAL', 'MAJOR', 'MINOR', 'WARNING', 'INFO'],
      required: [true, 'Event severity is required'],
      index: true
    },
    status: {
      type: String,
      enum: ['OPEN', 'ACKNOWLEDGED', 'RESOLVED'],
      default: 'OPEN',
      index: true
    },
    firstOccurredAt: {
      type: Date,
      required: [true, 'First occurrence timestamp is required'],
      index: true
    },
    lastOccurredAt: {
      type: Date,
      required: [true, 'Last occurrence timestamp is required'],
      index: true
    },
    notes: {
      type: String,
      default: ''
    },
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    acknowledgedAt: {
      type: Date,
      default: null
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    resolvedAt: {
      type: Date,
      default: null
    },
    statusHistory: [
      {
        status: {
          type: String,
          enum: ['OPEN', 'ACKNOWLEDGED', 'RESOLVED'],
          required: true
        },
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          default: null
        },
        changedAt: {
          type: Date,
          default: Date.now
        },
        notes: {
          type: String,
          default: ''
        }
      }
    ]
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

// Compound indexes for event matching and dashboard filtering
eventSchema.index({ siteId: 1, deviceId: 1, status: 1 });
eventSchema.index({ status: 1, severity: 1 });
eventSchema.index({ firstOccurredAt: -1 });

const Event = mongoose.models.Event || mongoose.model('Event', eventSchema);

module.exports = Event;

