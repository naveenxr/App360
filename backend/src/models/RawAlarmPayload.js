const mongoose = require('mongoose');

const rawAlarmPayloadSchema = new mongoose.Schema(
  {
    sourceId: {
      type: String,
      required: [true, 'Source identifier is required'],
      trim: true
    },
    ingestionBatchId: {
      type: String,
      required: [true, 'Ingestion batch ID is required'],
      index: true
    },
    rawPayload: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'Raw payload data is required']
    },
    checksum: {
      type: String,
      required: [true, 'Payload SHA-256 checksum is required'],
      index: true
    },
    ingestedAt: {
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

rawAlarmPayloadSchema.index({ checksum: 1, ingestedAt: -1 });

const RawAlarmPayload =
  mongoose.models.RawAlarmPayload ||
  mongoose.model('RawAlarmPayload', rawAlarmPayloadSchema);

module.exports = RawAlarmPayload;
