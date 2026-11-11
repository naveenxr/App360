const crypto = require('crypto');
const EventRepository = require('../repositories/EventRepository');
const AlarmRepository = require('../repositories/AlarmRepository');
const {
  broadcastIncidentCreated,
  broadcastIncidentUpdated
} = require('../websocket/socketBroadcaster');

/**
 * AIOps Rule-Based Alarm Correlation Service
 * 
 * Rules:
 * 1. Same siteId (case-insensitive exact match)
 * 2. Same deviceId (case-insensitive exact match)
 * 3. Strict 5-minute time window: Math.max(event.last, alarm.time) - Math.min(event.first, alarm.time) <= 300,000ms
 * 4. Merges candidate events when combined span <= 300,000ms
 * 5. Idempotent duplicate suppression
 * 6. Dynamic severity escalation to highest member severity
 */
class CorrelationService {
  constructor() {
    this.TIME_WINDOW_MS = 5 * 60 * 1000; // 5 minutes in milliseconds
    this.SEVERITY_WEIGHTS = {
      CRITICAL: 5,
      MAJOR: 4,
      MINOR: 3,
      WARNING: 2,
      INFO: 1
    };
  }

  /**
   * Generates a unique, collision-resistant event identifier
   * @returns {string} e.g. EVT-1718000000000-A1B2C3
   */
  generateEventId() {
    const timestamp = Date.now();
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `EVT-${timestamp}-${randomHex}`;
  }

  /**
   * Calculates the highest aggregate severity across an array of alarms or alarm severity items
   * @param {Array<Object|string>} alarms
   * @returns {string}
   */
  calculateAggregateSeverity(alarms = []) {
    if (!alarms || alarms.length === 0) {
      return 'INFO';
    }

    let maxWeight = 0;
    let highestSeverity = 'INFO';

    for (const item of alarms) {
      const sev = typeof item === 'string' ? item : item.severity;
      const normalizedSev = String(sev || '').toUpperCase();
      const weight = this.SEVERITY_WEIGHTS[normalizedSev] || 0;

      if (weight > maxWeight) {
        maxWeight = weight;
        highestSeverity = normalizedSev;
      }
    }

    return highestSeverity;
  }

  /**
   * Evaluates and correlates a normalized alarm document against existing active events.
   * 
   * @param {Object} alarmDoc - Mongoose Alarm doc or plain object
   * @returns {Promise<{ action: 'CREATED'|'UPDATED'|'MERGED'|'DUPLICATE', event: Object }>}
   */
  async correlateAlarm(alarmDoc) {
    if (!alarmDoc) {
      throw new Error('CorrelationService: Valid alarm document is required for correlation');
    }

    const siteId = String(alarmDoc.siteId || '').toUpperCase().trim();
    const deviceId = String(alarmDoc.deviceId || '').toUpperCase().trim();
    const alarmTime = new Date(alarmDoc.timestamp).getTime();
    const alarmId = alarmDoc._id;

    // 1. Fetch active candidate events for the same site and device
    const activeEvents = await EventRepository.findCandidateEvents(siteId, deviceId);

    // 2. Check for duplicate alarm membership across candidate events
    for (const candidate of activeEvents) {
      const containsAlarm = candidate.alarmIds.some(
        (id) => id.toString() === alarmId.toString()
      );
      if (containsAlarm) {
        return {
          action: 'DUPLICATE',
          event: candidate
        };
      }
    }

    // 3. Filter candidate events where adding this alarm satisfies the <= 5 min boundary
    const eligibleCandidates = [];
    for (const candidate of activeEvents) {
      const candFirst = new Date(candidate.firstOccurredAt).getTime();
      const candLast = new Date(candidate.lastOccurredAt).getTime();
      const tentativeFirst = Math.min(candFirst, alarmTime);
      const tentativeLatest = Math.max(candLast, alarmTime);
      const span = tentativeLatest - tentativeFirst;

      if (span <= this.TIME_WINDOW_MS) {
        eligibleCandidates.push(candidate);
      }
    }

    // ------------------------------------------------------------------------
    // CASE A: No eligible candidate -> Create a new correlated event
    // ------------------------------------------------------------------------
    if (eligibleCandidates.length === 0) {
      const newEvent = await EventRepository.create({
        eventId: this.generateEventId(),
        siteId,
        deviceId,
        alarmIds: [alarmId],
        correlationRule: 'SAME_SITE_DEVICE_5MIN',
        severity: alarmDoc.severity || 'INFO',
        status: 'OPEN',
        firstOccurredAt: new Date(alarmTime),
        lastOccurredAt: new Date(alarmTime)
      });

      if (alarmId) {
        await AlarmRepository.update(alarmId, { correlatedEventId: newEvent._id });
      }

      broadcastIncidentCreated(newEvent);

      return {
        action: 'CREATED',
        event: newEvent
      };
    }

    // ------------------------------------------------------------------------
    // CASE B: Exactly 1 eligible candidate -> Join and update existing event
    // ------------------------------------------------------------------------
    if (eligibleCandidates.length === 1) {
      const targetEvent = eligibleCandidates[0];
      const curFirst = new Date(targetEvent.firstOccurredAt).getTime();
      const curLast = new Date(targetEvent.lastOccurredAt).getTime();

      targetEvent.firstOccurredAt = new Date(Math.min(curFirst, alarmTime));
      targetEvent.lastOccurredAt = new Date(Math.max(curLast, alarmTime));

      const existingIds = targetEvent.alarmIds.map((id) => id.toString());
      if (!existingIds.includes(alarmId.toString())) {
        targetEvent.alarmIds.push(alarmId);
      }

      // Dynamic severity calculation based on all constituent alarms
      const memberAlarms = await AlarmRepository.findAll({
        _id: { $in: targetEvent.alarmIds }
      });
      targetEvent.severity = this.calculateAggregateSeverity(memberAlarms);

      await targetEvent.save();

      if (alarmId) {
        await AlarmRepository.update(alarmId, { correlatedEventId: targetEvent._id });
      }

      broadcastIncidentUpdated(targetEvent);

      return {
        action: 'UPDATED',
        event: targetEvent
      };
    }

    // ------------------------------------------------------------------------
    // CASE C: Multiple eligible candidates -> Evaluate merging vs selective join
    // ------------------------------------------------------------------------
    let combinedEarliest = alarmTime;
    let combinedLatest = alarmTime;

    for (const cand of eligibleCandidates) {
      const cFirst = new Date(cand.firstOccurredAt).getTime();
      const cLast = new Date(cand.lastOccurredAt).getTime();
      combinedEarliest = Math.min(combinedEarliest, cFirst);
      combinedLatest = Math.max(combinedLatest, cLast);
    }

    const combinedSpan = combinedLatest - combinedEarliest;

    // Subcase C1: All candidates + alarm span <= 5 minutes -> MERGE
    if (combinedSpan <= this.TIME_WINDOW_MS) {
      // Sort candidates by earliest firstOccurredAt to select the primary event
      eligibleCandidates.sort(
        (a, b) => new Date(a.firstOccurredAt) - new Date(b.firstOccurredAt)
      );

      const primaryEvent = eligibleCandidates[0];
      const secondaryEvents = eligibleCandidates.slice(1);

      const allAlarmIdsSet = new Set(
        primaryEvent.alarmIds.map((id) => id.toString())
      );
      allAlarmIdsSet.add(alarmId.toString());

      for (const sec of secondaryEvents) {
        sec.alarmIds.forEach((id) => allAlarmIdsSet.add(id.toString()));
      }

      primaryEvent.alarmIds = Array.from(allAlarmIdsSet);
      primaryEvent.firstOccurredAt = new Date(combinedEarliest);
      primaryEvent.lastOccurredAt = new Date(combinedLatest);

      const memberAlarms = await AlarmRepository.findAll({
        _id: { $in: primaryEvent.alarmIds }
      });
      primaryEvent.severity = this.calculateAggregateSeverity(memberAlarms);

      await primaryEvent.save();

      // Update all alarms to reference primaryEvent._id
      await AlarmRepository.model.updateMany(
        { _id: { $in: primaryEvent.alarmIds } },
        { $set: { correlatedEventId: primaryEvent._id } }
      );

      // Remove secondary events that merged into primaryEvent
      const secondaryIds = secondaryEvents.map((s) => s._id);
      if (secondaryIds.length > 0) {
        await EventRepository.model.deleteMany({ _id: { $in: secondaryIds } });
      }

      broadcastIncidentUpdated(primaryEvent);

      return {
        action: 'MERGED',
        event: primaryEvent
      };
    }

    // Subcase C2: Combined span > 5 minutes -> Prevent merging, select minimal expansion
    let bestCandidate = null;
    let minExpansion = Infinity;

    for (const cand of eligibleCandidates) {
      const cFirst = new Date(cand.firstOccurredAt).getTime();
      const cLast = new Date(cand.lastOccurredAt).getTime();
      const curSpan = cLast - cFirst;
      const newSpan = Math.max(cLast, alarmTime) - Math.min(cFirst, alarmTime);
      const expansion = newSpan - curSpan;

      if (expansion < minExpansion) {
        minExpansion = expansion;
        bestCandidate = cand;
      }
    }

    const cFirst = new Date(bestCandidate.firstOccurredAt).getTime();
    const cLast = new Date(bestCandidate.lastOccurredAt).getTime();
    bestCandidate.firstOccurredAt = new Date(Math.min(cFirst, alarmTime));
    bestCandidate.lastOccurredAt = new Date(Math.max(cLast, alarmTime));

    const existingIds = bestCandidate.alarmIds.map((id) => id.toString());
    if (!existingIds.includes(alarmId.toString())) {
      bestCandidate.alarmIds.push(alarmId);
    }

    const memberAlarms = await AlarmRepository.findAll({
      _id: { $in: bestCandidate.alarmIds }
    });
    bestCandidate.severity = this.calculateAggregateSeverity(memberAlarms);

    await bestCandidate.save();

    if (alarmId) {
      await AlarmRepository.update(alarmId, { correlatedEventId: bestCandidate._id });
    }

    broadcastIncidentUpdated(bestCandidate);

    return {
      action: 'UPDATED',
      event: bestCandidate
    };
  }

  /**
   * Batch process unlinked active alarms and correlate them
   * @returns {Promise<Object>} Execution summary
   */
  async processUnlinkedAlarms() {
    const unlinkedAlarms = await AlarmRepository.findAll(
      { correlatedEventId: null },
      null,
      { sort: { timestamp: 1 } }
    );

    let createdCount = 0;
    let updatedCount = 0;
    let mergedCount = 0;

    for (const alarm of unlinkedAlarms) {
      const result = await this.correlateAlarm(alarm);
      if (result.action === 'CREATED') createdCount++;
      else if (result.action === 'UPDATED') updatedCount++;
      else if (result.action === 'MERGED') mergedCount++;
    }

    return {
      processedCount: unlinkedAlarms.length,
      createdCount,
      updatedCount,
      mergedCount,
      eventsCreated: createdCount,
      eventsUpdated: updatedCount
    };
  }

  /**
   * Alias for processUnlinkedAlarms for correlation test suites
   */
  async runCorrelation() {
    return await this.processUnlinkedAlarms();
  }
}

module.exports = new CorrelationService();
