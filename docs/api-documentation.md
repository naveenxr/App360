# App360 REST API Specification & Contract

> **Document Version:** 1.0.0  
> **Protocol:** HTTPS / RESTful JSON  
> **Base URL:** `/api/v1`  
> **Security:** Bearer JWT in `Authorization` header  

---

## 1. Global API Standards

### Standard Headers
```http
Content-Type: application/json
Authorization: Bearer <jwt_token>
```

### Standard Response Envelope
All API responses follow a uniform contract:

#### Success Envelope (`200 OK`, `201 Created`)
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 120,
    "totalPages": 6
  },
  "timestamp": "2026-11-11T10:00:00.000Z"
}
```

#### Error Envelope (`400`, `401`, `403`, `404`, `422`, `500`)
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "User lacks required permission for action",
    "details": null,
    "timestamp": "2026-11-11T10:00:00.000Z"
  }
}
```

---

## 2. Authentication & Session Endpoints

### 2.1. Login
- **Endpoint:** `POST /api/v1/auth/login`
- **Access:** Public
- **Description:** Authenticates user credentials, returns signed JWT and populated user profile with dynamic permissions.

#### Request Body
```json
{
  "email": "engineer@app360.internal",
  "password": "SecurePassword123!"
}
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h",
    "user": {
      "id": "6731e8c9f1a23b4567890123",
      "username": "lead_engineer",
      "email": "engineer@app360.internal",
      "role": {
        "id": "6731e8c9f1a23b4567890120",
        "name": "ENGINEER",
        "permissions": [
          { "module": "ALARM", "actions": ["READ", "UPDATE"] },
          { "module": "MAP", "actions": ["READ"] },
          { "module": "API", "actions": ["READ", "EXECUTE"] }
        ]
      }
    }
  },
  "timestamp": "2026-11-11T10:00:00.000Z"
}
```

---

### 2.2. Get Current Session (`Me`)
- **Endpoint:** `GET /api/v1/auth/me`
- **Access:** Authenticated (Any Role)
- **Description:** Returns the live authenticated user record and active database permissions.

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "id": "6731e8c9f1a23b4567890123",
    "username": "lead_engineer",
    "email": "engineer@app360.internal",
    "role": "ENGINEER",
    "permissions": [
      { "module": "ALARM", "actions": ["READ", "UPDATE"] },
      { "module": "MAP", "actions": ["READ"] },
      { "module": "API", "actions": ["READ", "EXECUTE"] }
    ]
  },
  "timestamp": "2026-11-11T10:00:00.000Z"
}
```

---

## 3. RBAC Administration Endpoints

### 3.1. List Users
- **Endpoint:** `GET /api/v1/admin/users`
- **Access:** Admin only (`USER_MANAGEMENT:READ`)
- **Query Parameters:** `page=1&limit=20&search=john`

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": [
    {
      "id": "6731e8c9f1a23b4567890123",
      "username": "lead_engineer",
      "email": "engineer@app360.internal",
      "role": { "id": "6731...", "name": "ENGINEER" },
      "isActive": true,
      "lastLogin": "2026-11-11T09:45:00.000Z",
      "createdAt": "2026-11-10T12:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 },
  "timestamp": "2026-11-11T10:00:00.000Z"
}
```

---

### 3.2. Create User
- **Endpoint:** `POST /api/v1/admin/users`
- **Access:** Admin only (`USER_MANAGEMENT:CREATE`)

#### Request Body
```json
{
  "username": "noc_operator_1",
  "email": "noc1@app360.internal",
  "password": "NocPassword2026!",
  "roleId": "6731e8c9f1a23b4567890120"
}
```

#### Response (`201 Created`)
```json
{
  "success": true,
  "data": {
    "id": "6731e8c9f1a23b4567890124",
    "username": "noc_operator_1",
    "email": "noc1@app360.internal",
    "roleId": "6731e8c9f1a23b4567890120",
    "isActive": true,
    "createdAt": "2026-11-11T10:02:00.000Z"
  },
  "timestamp": "2026-11-11T10:02:00.000Z"
}
```

---

### 3.3. Update User Role & Status
- **Endpoint:** `PUT /api/v1/admin/users/:id`
- **Access:** Admin only (`USER_MANAGEMENT:UPDATE`)

#### Request Body
```json
{
  "roleId": "6731e8c9f1a23b4567890121",
  "isActive": true
}
```

---

### 3.4. List Roles & Permission Matrix
- **Endpoint:** `GET /api/v1/admin/roles`
- **Access:** Admin only (`USER_MANAGEMENT:READ`)

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": [
    {
      "id": "6731e8c9f1a23b4567890119",
      "name": "ADMIN",
      "description": "Full system administrator",
      "isSystem": true,
      "permissions": [
        { "module": "ALARM", "actions": ["READ", "CREATE", "UPDATE", "DELETE", "EXECUTE"] },
        { "module": "MAP", "actions": ["READ", "CREATE", "UPDATE", "DELETE", "EXECUTE"] },
        { "module": "API", "actions": ["READ", "CREATE", "UPDATE", "DELETE", "EXECUTE"] },
        { "module": "USER_MANAGEMENT", "actions": ["READ", "CREATE", "UPDATE", "DELETE", "EXECUTE"] }
      ]
    },
    {
      "id": "6731e8c9f1a23b4567890120",
      "name": "ENGINEER",
      "description": "Network operations engineer",
      "isSystem": true,
      "permissions": [
        { "module": "ALARM", "actions": ["READ", "UPDATE"] },
        { "module": "MAP", "actions": ["READ"] },
        { "module": "API", "actions": ["READ", "EXECUTE"] }
      ]
    },
    {
      "id": "6731e8c9f1a23b4567890121",
      "name": "VIEWER",
      "description": "Read-only executive viewer",
      "isSystem": true,
      "permissions": [
        { "module": "ALARM", "actions": ["READ"] },
        { "module": "MAP", "actions": ["READ"] }
      ]
    }
  ],
  "timestamp": "2026-11-11T10:00:00.000Z"
}
```

---

### 3.5. Update Module-Level Permissions for a Role
- **Endpoint:** `PUT /api/v1/admin/roles/:id/permissions`
- **Access:** Admin only (`USER_MANAGEMENT:UPDATE`)
- **Description:** Dynamically modifies permissions for a role in the database.

#### Request Body
```json
{
  "permissions": [
    { "module": "ALARM", "actions": ["READ", "UPDATE"] },
    { "module": "MAP", "actions": ["READ"] },
    { "module": "API", "actions": ["READ"] }
  ]
}
```

---

## 4. Multi-Source Ingestion & Adapter Endpoints

### 4.1. Trigger Ingestion Cycle
- **Endpoint:** `POST /api/v1/ingestion/trigger`
- **Access:** Admin or Engineer (`API:EXECUTE`)
- **Description:** Initiates an immediate pull cycle across all configured external telemetry sources.

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "batchId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "sourcesPolled": ["SOURCE_A_CORE_NMS", "SOURCE_B_EDGE_RAN"],
    "rawPayloadsSaved": 12,
    "alarmsNormalized": 12,
    "duplicatesSuppressed": 2,
    "eventsCreated": 1,
    "eventsUpdated": 1,
    "durationMs": 142
  },
  "timestamp": "2026-11-11T10:05:00.000Z"
}
```

---

### 4.2. Ingestion Status & Telemetry Health
- **Endpoint:** `GET /api/v1/ingestion/status`
- **Access:** Admin or Engineer (`API:READ`)

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "schedulerActive": true,
    "cronSchedule": "*/1 * * * *",
    "lastRunAt": "2026-11-11T10:04:00.000Z",
    "lastBatchStatus": "SUCCESS",
    "totalIngested24h": 4320,
    "sources": [
      { "id": "SOURCE_A_CORE_NMS", "status": "ONLINE", "lastPolled": "2026-11-11T10:04:00.000Z" },
      { "id": "SOURCE_B_EDGE_RAN", "status": "ONLINE", "lastPolled": "2026-11-11T10:04:00.000Z" }
    ]
  },
  "timestamp": "2026-11-11T10:05:00.000Z"
}
```

---

### 4.3. Mock External Source A (Core IP NMS)
- **Endpoint:** `GET /api/v1/ingestion/mock-source-a`
- **Access:** Internal / Test Source
- **Format:** Emulates legacy telecommunication NMS with PascalCase keys and numeric severity codes.

```json
{
  "StationCode": "SITE-MUM-01",
  "DeviceHostname": "RTR-MUM-CORE-01",
  "AlarmIdentifier": "NMS-99412",
  "AlarmName": "BGP_PEER_DOWN",
  "SeverityCode": 100,
  "EpochTimestamp": 1731319200000,
  "SummaryText": "BGP session with AS64512 terminated unexpectedly"
}
```

---

### 4.4. Mock External Source B (Edge RAN REST)
- **Endpoint:** `GET /api/v1/ingestion/mock-source-b`
- **Access:** Internal / Test Source
- **Format:** Emulates modern microservices RAN gateway with snake_case and string severity codes.

```json
{
  "alert_id": "ran-alert-8831",
  "location": { "site_tag": "SITE-MUM-01" },
  "equipment_id": "BS-MUM-SECTOR-01",
  "event_category": "RADIO_LINK_FAILURE",
  "level": "FATAL",
  "timestamp_utc": "2026-11-11T10:01:15Z",
  "details": { "message": "Downlink synchronization lost on carrier 1" }
}
```

---

## 5. Normalized Alarms & Raw Drill-Down Endpoints

### 5.1. List Normalized Alarms
- **Endpoint:** `GET /api/v1/alarms`
- **Access:** `ALARM:READ`
- **Query Parameters:** `page=1&limit=20&severity=CRITICAL&siteId=SITE-MUM-01&status=ACTIVE`

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": [
    {
      "id": "6731e8c9f1a23b4567890130",
      "alarmId": "ALM-20261111-0089",
      "sourceId": "SOURCE_A_CORE_NMS",
      "siteId": "SITE-MUM-01",
      "deviceId": "RTR-MUM-CORE-01",
      "severity": "CRITICAL",
      "alarmType": "BGP_PEER_DOWN",
      "description": "BGP session with AS64512 terminated unexpectedly",
      "occurredAt": "2026-11-11T10:00:00.000Z",
      "status": "ACTIVE",
      "repeatCount": 1,
      "correlatedEventId": "6731e8c9f1a23b4567890199",
      "rawPayloadId": "6731e8c9f1a23b4567890110"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 },
  "timestamp": "2026-11-11T10:05:00.000Z"
}
```

---

### 5.2. Drill-Down to Raw Ingested Payload
- **Endpoint:** `GET /api/v1/alarms/:id/raw`
- **Access:** `ALARM:READ`
- **Description:** Returns the exact wire payload as received from the external source for forensic investigation.

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "alarmId": "ALM-20261111-0089",
    "sourceId": "SOURCE_A_CORE_NMS",
    "ingestedAt": "2026-11-11T10:00:02.140Z",
    "checksum": "a8f5f167f44f4964e6c998dee827110c...",
    "rawPayload": {
      "StationCode": "SITE-MUM-01",
      "DeviceHostname": "RTR-MUM-CORE-01",
      "AlarmIdentifier": "NMS-99412",
      "AlarmName": "BGP_PEER_DOWN",
      "SeverityCode": 100,
      "EpochTimestamp": 1731319200000,
      "SummaryText": "BGP session with AS64512 terminated unexpectedly"
    }
  },
  "timestamp": "2026-11-11T10:05:00.000Z"
}
```

---

## 6. Correlated Events (AIOps) Endpoints

### 6.1. List Correlated Incidents
- **Endpoint:** `GET /api/v1/events`
- **Access:** `ALARM:READ`
- **Query Parameters:** `status=OPEN&severity=CRITICAL&siteId=SITE-MUM-01`

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": [
    {
      "id": "6731e8c9f1a23b4567890199",
      "eventNumber": "EVT-20261111-0004",
      "title": "Cascading Outage at SITE-MUM-01 initiated by RTR-MUM-CORE-01",
      "siteId": "SITE-MUM-01",
      "primaryDeviceId": "RTR-MUM-CORE-01",
      "involvedDeviceIds": ["RTR-MUM-CORE-01", "SW-MUM-ACC-01", "BS-MUM-SECTOR-01"],
      "severity": "CRITICAL",
      "status": "OPEN",
      "rootCauseHeuristic": "Upstream Core Router BGP / Interface Link Down propagating downstream device unreachability",
      "alarmCount": 5,
      "windowStartTime": "2026-11-11T10:00:00.000Z",
      "windowEndTime": "2026-11-11T10:06:15.000Z",
      "lastAlarmAt": "2026-11-11T10:01:15.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 },
  "timestamp": "2026-11-11T10:05:00.000Z"
}
```

---

### 6.2. Get Correlated Event Details & Constituent Alarms
- **Endpoint:** `GET /api/v1/events/:id`
- **Access:** `ALARM:READ`
- **Description:** Returns the event details and populates all member alarms for timeline analysis.

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "id": "6731e8c9f1a23b4567890199",
    "eventNumber": "EVT-20261111-0004",
    "title": "Cascading Outage at SITE-MUM-01",
    "siteId": "SITE-MUM-01",
    "primaryDeviceId": "RTR-MUM-CORE-01",
    "involvedDeviceIds": ["RTR-MUM-CORE-01", "SW-MUM-ACC-01", "BS-MUM-SECTOR-01"],
    "severity": "CRITICAL",
    "status": "OPEN",
    "rootCauseHeuristic": "Upstream Core Router BGP / Interface Link Down",
    "alarmCount": 2,
    "windowStartTime": "2026-11-11T10:00:00.000Z",
    "windowEndTime": "2026-11-11T10:06:15.000Z",
    "constituentAlarms": [
      {
        "id": "6731e8c9f1a23b4567890130",
        "alarmId": "ALM-20261111-0089",
        "deviceId": "RTR-MUM-CORE-01",
        "alarmType": "BGP_PEER_DOWN",
        "severity": "CRITICAL",
        "occurredAt": "2026-11-11T10:00:00.000Z"
      },
      {
        "id": "6731e8c9f1a23b4567890131",
        "alarmId": "ALM-20261111-0090",
        "deviceId": "BS-MUM-SECTOR-01",
        "alarmType": "RADIO_LINK_FAILURE",
        "severity": "CRITICAL",
        "occurredAt": "2026-11-11T10:01:15.000Z"
      }
    ]
  },
  "timestamp": "2026-11-11T10:05:00.000Z"
}
```

---

### 6.3. Update Correlated Event Status
- **Endpoint:** `PATCH /api/v1/events/:id/status`
- **Access:** Admin or Engineer (`ALARM:UPDATE`)

#### Request Body
```json
{
  "status": "INVESTIGATING",
  "notes": "Field technician dispatched to site substation"
}
```

---

## 7. Interactive Topology & Map Endpoints

### 7.1. Get Sites with Rollup Severity
- **Endpoint:** `GET /api/v1/topology/sites`
- **Access:** `MAP:READ`
- **Query Parameters:** `region=West&severity=CRITICAL`

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": [
    {
      "siteId": "SITE-MUM-01",
      "name": "Mumbai Central Exchange",
      "region": "West",
      "coordinates": { "latitude": 18.9712, "longitude": 72.8197 },
      "status": "ACTIVE",
      "currentSeverity": "CRITICAL",
      "activeAlarmCount": 5
    },
    {
      "siteId": "SITE-PUN-01",
      "name": "Pune Shivaji Hub",
      "region": "West",
      "coordinates": { "latitude": 18.5204, "longitude": 73.8567 },
      "status": "ACTIVE",
      "currentSeverity": "CLEAR",
      "activeAlarmCount": 0
    }
  ],
  "timestamp": "2026-11-11T10:05:00.000Z"
}
```

---

### 7.2. Dynamic Node Marker Selection (Fetch Live Alarms)
- **Endpoint:** `GET /api/v1/topology/nodes/:id/alarms`
- **Access:** `MAP:READ`
- **Description:** Called dynamically when a user clicks a node or site marker on the Leaflet map.

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "node": {
      "deviceId": "RTR-MUM-CORE-01",
      "name": "Core Router 1",
      "siteId": "SITE-MUM-01",
      "type": "ROUTER",
      "ipAddress": "10.200.1.1",
      "status": "DEGRADED",
      "currentSeverity": "CRITICAL"
    },
    "activeAlarms": [
      {
        "id": "6731e8c9f1a23b4567890130",
        "alarmId": "ALM-20261111-0089",
        "alarmType": "BGP_PEER_DOWN",
        "severity": "CRITICAL",
        "occurredAt": "2026-11-11T10:00:00.000Z",
        "description": "BGP session with AS64512 terminated unexpectedly"
      }
    ],
    "linkedCorrelatedEvent": {
      "id": "6731e8c9f1a23b4567890199",
      "eventNumber": "EVT-20261111-0004",
      "title": "Cascading Outage at SITE-MUM-01",
      "severity": "CRITICAL",
      "rootCauseHeuristic": "Upstream Core Router BGP / Interface Link Down"
    }
  },
  "timestamp": "2026-11-11T10:05:00.000Z"
}
```

---

### 7.3. Network Topology KPI Summary
- **Endpoint:** `GET /api/v1/topology/summary`
- **Access:** `MAP:READ`

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "totalSites": 12,
    "totalDevices": 48,
    "activeAlarms": 15,
    "openCorrelatedEvents": 3,
    "severityBreakdown": {
      "CRITICAL": 3,
      "MAJOR": 5,
      "MINOR": 4,
      "WARNING": 3,
      "CLEAR": 33
    }
  },
  "timestamp": "2026-11-11T10:05:00.000Z"
}
```
