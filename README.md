# App360 – Network Monitoring and Alarm Management System

A production-grade, enterprise-ready take-home application aligned with the **App360 Architecture** (Data Layer, Business Logic Layer, Presentation Layer, Agentic-ready design) featuring:
- **Configurable Database-Driven RBAC** (Admin, Engineer, Viewer with per-module permissions).
- **AIOps-Inspired Rule-Based Alarm Correlation Engine** (multi-source ingestion, schema normalization, sliding time-window correlation, grouped events, raw alarm drill-down).
- **Interactive Network Topology Map** (React Leaflet, dynamic severity color coding, node inspection, region/severity filtering).
- **Multi-Source External Ingestion Pipeline** (REST mock sources, periodic cron ingestion, raw data preservation).
- **Strict Layered Separation**: Presentation (Next.js), Business Logic (Express: Controllers, Services, Correlation Engine, Normalization), Data Layer (Repositories, Mongoose Models, MongoDB).

---

## Technology Stack

- **Frontend**: Next.js (App Router) + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express.js + TypeScript
- **Database**: MongoDB + Mongoose (Repository pattern)
- **Authentication**: JWT (JSON Web Tokens) with HTTP-only cookies / Bearer auth & bcryptjs
- **Validation**: Zod schema validation
- **Mapping**: React Leaflet + OpenStreetMap
- **Scheduling**: node-cron
- **Deployment Target**: Zoho Catalyst

---

## Architectural Mapping

```
┌─────────────────────────────────────────────────────────────┐
│               PRESENTATION LAYER (Next.js)                  │
│  - Interactive Map (Leaflet)      - Dynamic Filters         │
│  - Correlated Alarms & Drill-down - RBAC Admin Console      │
│  - Auth Context & Route Guards    - Axios API Client        │
└──────────────────────────────▲──────────────────────────────┘
                               │ REST APIs (Only)
┌──────────────────────────────▼──────────────────────────────┐
│             BUSINESS LOGIC LAYER (Express.js)               │
│  - Controllers & Routes          - RBAC & Auth Middleware   │
│  - Ingestion & Normalizer        - Correlation Engine       │
│  - Domain Services               - Schedulers (node-cron)   │
└──────────────────────────────▲──────────────────────────────┘
                               │ Repositories Only
┌──────────────────────────────▼──────────────────────────────┐
│                    DATA LAYER (MongoDB)                     │
│  - Mongoose Schemas & Models     - Repositories (CRUD/Aggr) │
│  - Users & Roles Collections     - Alarms & Raw Payload Col │
│  - Correlated Events Collection  - Network Sites & Nodes    │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase Roadmap

1. **Phase 0: Environment & Architecture Baseline** (Complete)
   - Extracted primary specifications from `App360_User_Story.docx`.
   - Verified Node.js, npm, MongoDB server connectivity, and initialized Git repository.
2. **Phase 1: Backend Foundation & Layered Skeleton**
   - Express + TypeScript setup, config management, DB connection, repository/service/controller scaffolding, error handling middleware, health checks.
3. **Phase 2: Database-Driven RBAC & Authentication System**
   - Dynamic permissions per module (Alarm, Map, API), roles (Admin, Engineer, Viewer), JWT auth, bcryptjs password hashing, RBAC middleware.
4. **Phase 3: Multi-Source API Ingestion & Normalization Engine**
   - Mock external REST API sources, schema normalization, raw payload audit storage, node-cron scheduled ingestion.
5. **Phase 4: Rule-Based Alarm Correlation Engine (AIOps)**
   - Correlate alarms by site, device, and sliding time window into grouped events with root cause heuristics and raw alarm drill-down.
6. **Phase 5: Network Topology & Dynamic Map APIs**
   - Sites & nodes management, geographic coordinates, dynamic severity rollups, region/severity filtering endpoints.
7. **Phase 6: Next.js Frontend Foundation & Auth/RBAC UI**
   - Next.js App Router, Tailwind CSS, auth context, login view, role & permission admin console.
8. **Phase 7: Interactive Map & Alarm Management UI**
   - Leaflet map integration, severity markers (green/yellow/red), node detail drawer, correlated alarm feeds, raw alarm inspection drawer.
9. **Phase 8: End-to-End Integration, Demo Seeding & Zoho Catalyst Packaging**
   - Comprehensive seed dataset, automated tests, full verification, Zoho Catalyst configuration (`catalyst.json`), and architecture presentation documentation.

