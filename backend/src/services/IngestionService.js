const crypto = require('crypto');
const SourceAAdapter = require('../adapters/SourceAAdapter');
const SourceBAdapter = require('../adapters/SourceBAdapter');
const SourceCAdapter = require('../adapters/SourceCAdapter');
const AlarmNormalizer = require('./AlarmNormalizer');
const AlarmRepository = require('../repositories/AlarmRepository');
const RawAlarmPayloadRepository = require('../repositories/RawAlarmPayloadRepository');
const IngestionLogRepository = require('../repositories/IngestionLogRepository');
const correlationService = require('./correlationService');

class IngestionService {
  constructor() {
    this.adapters = [SourceAAdapter, SourceBAdapter, SourceCAdapter];
    this.isIngestionRunning = false;
  }

  /**
   * Executes a full multi-source ingestion cycle.
   * Tolerates independent source failures.
   * Automatically triggers correlation for each ingested alarm.
   * 
   * @param {Object} options 
   * @returns {Promise<Object>} Ingestion batch summary
   */
  async executeIngestion(options = {}) {
    if (this.isIngestionRunning) {
      console.warn('⚠️ Ingestion cycle skipped: prior ingestion batch still executing.');
      return {
        skipped: true,
        reason: 'Concurrent ingestion execution prevented by mutex lock'
      };
    }

    this.isIngestionRunning = true;
    const batchId = `BATCH-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const startedAt = new Date();
    const triggeredBy = options.triggeredBy || 'MANUAL';
    const triggeredByEmail = options.triggeredByEmail || null;

    console.log(`\n=============================================================`);
    console.log(`📥 Starting Ingestion Batch [${batchId}] triggered by [${triggeredBy}]`);
    console.log(`=============================================================`);

    const sourceResults = [];
    let totalFetched = 0;
    let totalNormalized = 0;
    let totalDuplicates = 0;
    let totalFailed = 0;
    let totalEventsCreated = 0;
    let totalEventsUpdated = 0;

    try {
      for (const adapter of this.adapters) {
        const sourceId = adapter.sourceId;
        const sourceSummary = {
          sourceId,
          status: 'SUCCESS',
          fetchedCount: 0,
          normalizedCount: 0,
          duplicateCount: 0,
          error: null
        };

        try {
          console.log(`🔄 Polling source: [${sourceId}]...`);
          const rawItems = await adapter.fetchRawData(options);
          sourceSummary.fetchedCount = rawItems.length;
          totalFetched += rawItems.length;

          for (const rawItem of rawItems) {
            try {
              // 1. Transform vendor-specific fields into candidate format
              const candidate = adapter.transform(rawItem);

              // 2. Normalize and validate against canonical schema
              const canonical = AlarmNormalizer.normalize(candidate);

              // 3. Compute raw wire checksum and store lossless audit record
              const checksum = AlarmNormalizer.calculateChecksum(rawItem);
              const rawDoc = await RawAlarmPayloadRepository.create({
                sourceId,
                externalAlarmId: canonical.externalAlarmId,
                ingestionBatchId: batchId,
                rawPayload: rawItem,
                checksum,
                ingestedAt: new Date()
              });

              // 4. Idempotently upsert alarm into database
              const { alarm, isNew } = await AlarmRepository.upsertAlarm(canonical, rawDoc._id);

              if (isNew) {
                sourceSummary.normalizedCount += 1;
                totalNormalized += 1;

                // 5. Automatically pass new alarm to CorrelationService
                try {
                  const correlationResult = await correlationService.correlateAlarm(alarm);
                  if (correlationResult.action === 'CREATED') {
                    totalEventsCreated += 1;
                  } else if (correlationResult.action === 'UPDATED' || correlationResult.action === 'MERGED') {
                    totalEventsUpdated += 1;
                  }
                } catch (corrErr) {
                  // Do not block ingestion if correlation encounters an isolated error
                  console.error(`⚠️ Correlation error for alarm [${alarm.externalAlarmId}]:`, corrErr.message);
                }
              } else {
                sourceSummary.duplicateCount += 1;
                totalDuplicates += 1;
              }
            } catch (itemErr) {
              console.error(`❌ Item normalization error in [${sourceId}]:`, itemErr.message);
              totalFailed += 1;
            }
          }

          console.log(`✅ [${sourceId}] processed: ${sourceSummary.normalizedCount} new, ${sourceSummary.duplicateCount} duplicates`);
        } catch (sourceErr) {
          // Independent source failure isolation: log error and continue with other sources
          console.error(`⚠️ Source [${sourceId}] failed during polling:`, sourceErr.message);
          sourceSummary.status = 'FAILED';
          sourceSummary.error = sourceErr.message;
          totalFailed += 1;
        }

        sourceResults.push(sourceSummary);
      }

      const completedAt = new Date();
      const durationMs = completedAt.getTime() - startedAt.getTime();

      // Determine overall batch status
      const hasSuccess = sourceResults.some((s) => s.status === 'SUCCESS');
      const hasFailure = sourceResults.some((s) => s.status === 'FAILED');

      let batchStatus = 'SUCCESS';
      if (hasSuccess && hasFailure) {
        batchStatus = 'PARTIAL';
      } else if (!hasSuccess && hasFailure) {
        batchStatus = 'FAILED';
      }

      // Persist structured audit log in IngestionLog collection
      const logRecord = await IngestionLogRepository.createLog({
        batchId,
        triggeredBy,
        triggeredByEmail,
        status: batchStatus,
        sources: sourceResults,
        totalFetched,
        totalNormalized,
        totalDuplicates,
        totalFailed,
        durationMs,
        startedAt,
        completedAt
      });

      console.log(`🏁 Batch [${batchId}] finished in ${durationMs}ms with status: [${batchStatus}] (Events Created: ${totalEventsCreated}, Updated: ${totalEventsUpdated})`);

      return {
        batchId,
        status: batchStatus,
        durationMs,
        totalFetched,
        totalNormalized,
        totalDuplicates,
        totalFailed,
        totalEventsCreated,
        totalEventsUpdated,
        sources: sourceResults,
        startedAt,
        completedAt,
        logId: logRecord._id
      };
    } finally {
      this.isIngestionRunning = false;
    }
  }

  async getIngestionStatus() {
    const latestLog = await IngestionLogRepository.getLatestLog();
    return {
      isIngestionRunning: this.isIngestionRunning,
      registeredSources: this.adapters.map((a) => a.sourceId),
      latestBatch: latestLog || null
    };
  }

  async listIngestionLogs(options = {}) {
    return await IngestionLogRepository.listLogs(options);
  }
}

module.exports = new IngestionService();
