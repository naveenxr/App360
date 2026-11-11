/**
 * Mock Multi-Source Telemetry Generator
 * Simulates three heterogeneous vendor monitoring systems.
 */

class MockSourcesService {
  constructor() {
    this.sourceFailureFlags = {
      SOURCE_A: false,
      SOURCE_B: false,
      SOURCE_C: false
    };
  }

  setSimulatedFailure(sourceId, shouldFail) {
    if (this.sourceFailureFlags.hasOwnProperty(sourceId)) {
      this.sourceFailureFlags[sourceId] = Boolean(shouldFail);
    }
  }

  getSourceAData(simulateFailure = false) {
    if (simulateFailure || this.sourceFailureFlags.SOURCE_A) {
      const err = new Error('Source A Network Monitoring API unreachable: Connection refused');
      err.status = 503;
      err.code = 'SOURCE_A_UNAVAILABLE';
      throw err;
    }

    // Source A format: PascalCase / flat underscore keys, level field
    return [
      {
        event_id: 'NET-1001',
        node: 'RTR001',
        location_code: 'CHN001',
        alarm: 'HIGH_CPU',
        level: 'CRITICAL',
        description: 'CPU usage exceeded 90 percent on primary core',
        event_time: '2026-11-11T10:00:00.000Z'
      },
      {
        event_id: 'NET-1002',
        node: 'SW001',
        location_code: 'CHN001',
        alarm: 'INTERFACE_FLAP',
        level: 'MAJOR',
        description: 'GigabitEthernet0/1 link flapping repeatedly',
        event_time: '2026-11-11T10:01:30.000Z'
      },
      {
        event_id: 'NET-1003',
        node: 'FW001',
        location_code: 'MUM001',
        alarm: 'MEM_THRESHOLD',
        level: 'WARNING',
        description: 'Firewall memory consumption at 82 percent',
        event_time: '2026-11-11T10:02:15.000Z'
      }
    ];
  }

  getSourceBData(simulateFailure = false) {
    if (simulateFailure || this.sourceFailureFlags.SOURCE_B) {
      const err = new Error('Source B Infrastructure Monitoring API timed out (504 Gateway Timeout)');
      err.status = 504;
      err.code = 'SOURCE_B_TIMEOUT';
      throw err;
    }

    // Source B format: Nested incident object, priority codes (P1, P2, P3)
    return [
      {
        incident: {
          id: 'INF-2001',
          device: 'RTR001',
          site: 'CHN001',
          category: 'CPU_THRESHOLD',
          priority: 'P1',
          details: 'High processor utilization across chassis',
          created_at: '2026-11-11T10:02:00.000Z'
        }
      },
      {
        incident: {
          id: 'INF-2002',
          device: 'PSU-01',
          site: 'CHN001',
          category: 'POWER_SUPPLY',
          priority: 'P2',
          details: 'Secondary power supply feed voltage drop',
          created_at: '2026-11-11T10:03:00.000Z'
        }
      },
      {
        incident: {
          id: 'INF-2003',
          device: 'SRV001',
          site: 'DEL001',
          category: 'DISK_CAPACITY',
          priority: 'P3',
          details: 'Root partition disk usage 88 percent',
          created_at: '2026-11-11T10:04:10.000Z'
        }
      }
    ];
  }

  getSourceCData(simulateFailure = false) {
    if (simulateFailure || this.sourceFailureFlags.SOURCE_C) {
      const err = new Error('Source C Network Connectivity service error: Internal Server Error (500)');
      err.status = 500;
      err.code = 'SOURCE_C_INTERNAL_ERROR';
      throw err;
    }

    // Source C format: notification_id, nested asset object, fault_type, occurred_on
    return [
      {
        notification_id: 'CON-3001',
        asset: {
          identifier: 'RTR001',
          site_code: 'CHN001'
        },
        fault_type: 'PACKET_LOSS',
        severity: 'MAJOR',
        message: 'Network packet loss detected over 15 percent threshold',
        occurred_on: '2026-11-11T10:04:00.000Z'
      },
      {
        notification_id: 'CON-3002',
        asset: {
          identifier: 'OPT001',
          site_code: 'MUM001'
        },
        fault_type: 'FIBER_ATTENUATION',
        severity: 'CRITICAL',
        message: 'Optical receive signal power degraded below -28dBm',
        occurred_on: '2026-11-11T10:05:00.000Z'
      },
      {
        notification_id: 'CON-3003',
        asset: {
          identifier: 'AP001',
          site_code: 'DEL001'
        },
        fault_type: 'BGP_SESSION_RESET',
        severity: 'INFO',
        message: 'BGP session state refreshed normally',
        occurred_on: '2026-11-11T10:06:00.000Z'
      }
    ];
  }
}

module.exports = new MockSourcesService();

