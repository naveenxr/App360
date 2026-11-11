const mongoose = require('mongoose');

const sourceResultSchema = new mongoose.Schema(
  {
    sourceId: { type: String, required: true },
    status: { type: String, enum: ['SUCCESS', 'FAILED'], required: true },
    fetchedCount: { type: Number, default: 0 },
    normalizedCount: { type: Number, default: 0 },
    duplicateCount: { type: Number, default: 0 },
    error: { type: String, default: null }
  },
  { _id: false }
);

const ingestionLogSchema = new mongoose.Schema(
  {
    batchId: {
      type: String,
      required: true,
      unique: true
    },
    triggeredBy: {
      type: String,
      enum: ['SCHEDULER', 'MANUAL', 'SYSTEM'],
      default: 'MANUAL',
      index: true
    },
    triggeredByEmail: {
      type: String,
      default: null
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'PARTIAL', 'FAILED'],
      required: true,
      index: true
    },
    sources: [sourceResultSchema],
    totalFetched: { type: Number, default: 0 },
    totalNormalized: { type: Number, default: 0 },
    totalDuplicates: { type: Number, default: 0 },
    totalFailed: { type: Number, default: 0 },
    durationMs: { type: Number, default: 0 },
    startedAt: { type: Date, required: true, index: true },
    completedAt: { type: Date, required: true }
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

const IngestionLog =
  mongoose.models.IngestionLog ||
  mongoose.model('IngestionLog', ingestionLogSchema);

module.exports = IngestionLog;
