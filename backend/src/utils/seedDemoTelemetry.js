const Alarm = require('../models/Alarm');
const RawAlarmPayload = require('../models/RawAlarmPayload');
const correlationService = require('../services/correlationService');
const TopologyService = require('../services/TopologyService');

/**
 * Seeds a realistic set of initial alarms, raw payloads, and correlated incidents
 * across Indian telecom sites (Chennai, Mumbai, Delhi, Bangalore) to provide an
 * immediate out-of-the-box carrier NOC demonstration.
 */
async function seedDemoTelemetry() {
  const existingAlarmsCount = await Alarm.countDocuments({});
  if (existingAlarmsCount > 0) {
    console.log('📡 Existing alarms detected in database, skipping demo telemetry seeding.');
    return;
  }

  console.log('🚀 Seeding realistic NOC demo telemetry across sites and devices...');

  const demoAlarms = [
    // --- CHENNAI CORE DC (CHN001 / RTR001) - Escalating Cascading Outage ---
    {
      sourceId: 'SOURCE_A',
      externalAlarmId: 'NET-DEMO-1001',
      siteId: 'CHN001',
      deviceId: 'RTR001',
      alarmType: 'HIGH_CPU',
      severity: 'WARNING',
      message: 'Core Processor utilization exceeded 85% threshold',
      timestamp: new Date('2026-11-11T10:00:00Z'),
      rawPayload: {
        event_id: 'NET-DEMO-1001',
        node: 'RTR001',
        location_code: 'CHN001',
        alarm: 'HIGH_CPU',
        level: 'WARNING',
        description: 'Core Processor utilization exceeded 85% threshold',
        event_time: '2026-11-11T10:00:00Z'
      }
    },
    {
      sourceId: 'SOURCE_B',
      externalAlarmId: 'INF-DEMO-2001',
      siteId: 'CHN001',
      deviceId: 'RTR001',
      alarmType: 'MEMORY_THRESHOLD',
      severity: 'MAJOR',
      message: 'Control plane memory fragmentation above 92%',
      timestamp: new Date('2026-11-11T10:02:15Z'),
      rawPayload: {
        incident: {
          id: 'INF-DEMO-2001',
          device: 'RTR001',
          site: 'CHN001',
          category: 'MEMORY_THRESHOLD',
          priority: 'P2',
          details: 'Control plane memory fragmentation above 92%',
          created_at: '2026-11-11T10:02:15Z'
        }
      }
    },
    {
      sourceId: 'SOURCE_C',
      externalAlarmId: 'CON-DEMO-3001',
      siteId: 'CHN001',
      deviceId: 'RTR001',
      alarmType: 'BGP_PEER_DOWN',
      severity: 'CRITICAL',
      message: 'Core BGP peer session terminated with AS64512',
      timestamp: new Date('2026-11-11T10:04:10Z'),
      rawPayload: {
        EVENT_RECORD: {
          TRACKING_ID: 'CON-DEMO-3001',
          ALARM_NAME: 'BGP_PEER_DOWN',
          URGENCY: 'CRITICAL',
          PAYLOAD_NOTE: 'Core BGP peer session terminated with AS64512',
          TIME_STAMP_EPOCH: 1794391450000,
          ASSET_INFO: {
            STATION_ID: 'CHN001',
            HARDWARE_TAG: 'RTR001'
          }
        }
      }
    },

    // --- MUMBAI WEST GATEWAY (MUM001 / FW001) - Security Perimeter Flap ---
    {
      sourceId: 'SOURCE_A',
      externalAlarmId: 'NET-DEMO-1002',
      siteId: 'MUM001',
      deviceId: 'FW001',
      alarmType: 'INTERFACE_FLAPPING',
      severity: 'MAJOR',
      message: 'Perimeter uplink interface 10GE-0/0/1 state flapping',
      timestamp: new Date('2026-11-11T10:10:00Z'),
      rawPayload: {
        event_id: 'NET-DEMO-1002',
        node: 'FW001',
        location_code: 'MUM001',
        alarm: 'INTERFACE_FLAPPING',
        level: 'MAJOR',
        description: 'Perimeter uplink interface 10GE-0/0/1 state flapping',
        event_time: '2026-11-11T10:10:00Z'
      }
    },
    {
      sourceId: 'SOURCE_B',
      externalAlarmId: 'INF-DEMO-2002',
      siteId: 'MUM001',
      deviceId: 'FW001',
      alarmType: 'SYN_FLOOD_DETECTED',
      severity: 'MAJOR',
      message: 'SYN packet flood anomaly detected exceeding 50,000 pps',
      timestamp: new Date('2026-11-11T10:12:30Z'),
      rawPayload: {
        incident: {
          id: 'INF-DEMO-2002',
          device: 'FW001',
          site: 'MUM001',
          category: 'SYN_FLOOD_DETECTED',
          priority: 'P2',
          details: 'SYN packet flood anomaly detected exceeding 50,000 pps',
          created_at: '2026-11-11T10:12:30Z'
        }
      }
    },

    // --- DELHI NORTHERN HUB (DEL001 / SW001) - Environmental Alert ---
    {
      sourceId: 'SOURCE_B',
      externalAlarmId: 'INF-DEMO-2003',
      siteId: 'DEL001',
      deviceId: 'SW001',
      alarmType: 'FAN_SPEED_LOW',
      severity: 'WARNING',
      message: 'Chassis exhaust fan speed below RPM operating threshold',
      timestamp: new Date('2026-11-11T10:20:00Z'),
      rawPayload: {
        incident: {
          id: 'INF-DEMO-2003',
          device: 'SW001',
          site: 'DEL001',
          category: 'FAN_SPEED_LOW',
          priority: 'WARNING',
          details: 'Chassis exhaust fan speed below RPM operating threshold',
          created_at: '2026-11-11T10:20:00Z'
        }
      }
    }
  ];

  for (const item of demoAlarms) {
    // 1. Create Raw Payload Audit record
    const rawDoc = await RawAlarmPayload.create({
      sourceId: item.sourceId,
      externalAlarmId: item.externalAlarmId,
      ingestionBatchId: 'DEMO-SEED-BATCH',
      rawPayload: item.rawPayload,
      checksum: `demo-checksum-${item.externalAlarmId}`,
      ingestedAt: new Date()
    });

    // 2. Persist canonical alarm
    const alarmDoc = await Alarm.create({
      sourceId: item.sourceId,
      externalAlarmId: item.externalAlarmId,
      siteId: item.siteId,
      deviceId: item.deviceId,
      alarmType: item.alarmType,
      severity: item.severity,
      message: item.message,
      timestamp: item.timestamp,
      status: 'ACTIVE',
      repeatCount: 1,
      rawPayload: item.rawPayload,
      rawPayloadId: rawDoc._id,
      ingestedAt: new Date()
    });

    // 3. Correlate through correlation service
    await correlationService.correlateAlarm(alarmDoc);
  }

  // Sync site and device severity rollups
  await TopologyService.syncActiveSeverities();

  console.log(`✅ Demo telemetry seeded: ${demoAlarms.length} alarms correlated across CHN001, MUM001, DEL001.`);
}

module.exports = { seedDemoTelemetry };
