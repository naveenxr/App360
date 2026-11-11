const mongoose = require('mongoose');

const alarmSchema = new mongoose.Schema(
  {
    sourceId: {
      type: String,
      required: [true, 'Source identifier is required'],
      trim: true,
      index: true
    },
    externalAlarmId: {
      type: String,
      required: [true, 'External alarm identifier is required'],
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
    deviceId: {
      type: String,
      required: [true, 'Device identifier is required'],
      uppercase: true,
      trim: true,
      index: true
    },
    alarmType: {
      type: String,
      required: [true, 'Alarm type category is required'],
      uppercase: true,
      trim: true
    },
    severity: {
      type: String,
      enum: ['CRITICAL', 'MAJOR', 'MINOR', 'WARNING', 'INFO'],
      required: [true, 'Alarm severity is required'],
      index: true
    },
    message: {
      type: String,
      required: [true, 'Alarm message description is required']
    },
    timestamp: {
      type: Date,
      required: [true, 'Occurrence timestamp is required'],
      index: true
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'ACKNOWLEDGED', 'CLEARED'],
      default: 'ACTIVE',
      index: true
    },
    rawPayload: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'Preserved raw payload is required']
    },
    rawPayloadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RawAlarmPayload',
      default: null,
      index: true
    },
    ingestedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    repeatCount: {
      type: Number,
      default: 1
    },
    correlatedEventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CorrelatedEvent',
      default: null,
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

// Enforce unique compound index to prevent duplicate ingestion records
alarmSchema.index({ sourceId: 1, externalAlarmId: 1 }, { unique: true });

// Compound indexes for temporal, severity, and topological queries
alarmSchema.index({ siteId: 1, deviceId: 1, timestamp: -1 });
alarmSchema.index({ status: 1, severity: 1 });
alarmSchema.index({ ingestedAt: -1 });

const Alarm = mongoose.models.Alarm || mongoose.model('Alarm', alarmSchema);

module.exports = Alarm;
