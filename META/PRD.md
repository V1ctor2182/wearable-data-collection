# Wearable Data Pipeline — Product Requirements Document

**Project**: SEA Lab Wearable Health Data Pipeline
**Organization**: SEA Lab, Columbia University
**Version**: 0.1.0
**Last Updated**: 2026-03-11

---

## 1. Overview

A unified data pipeline that collects, stores, and enables analysis of raw health data from 11 wearable devices. The system prioritizes **data completeness** over schema predefinition — it captures the full API response / exported file as JSONB, ensuring zero field loss even as device APIs evolve.

## 2. Problem Statement

Health researchers working with wearable device data face three core challenges:

1. **Fragmentation** — Each device has its own API, auth flow, export format, and data schema. There is no single place to query across devices.
2. **Schema Drift** — Device APIs add, remove, or rename fields without warning. Traditional column-per-field schemas break silently when this happens.
3. **Data Loss** — Most ETL pipelines only extract known fields. Unknown or newly added fields are discarded at ingestion time, with no way to recover them later.

## 3. Goals

- **G1**: Collect ALL available raw data from 11 wearable devices with zero field loss.
- **G2**: Store complete API responses / parsed files as JSONB — no ALTER TABLE when APIs change.
- **G3**: Support both automated (cron) and manual (on-demand) data pulls.
- **G4**: Deduplicate payloads by content hash to prevent storage bloat.
- **G5**: Provide a web dashboard for browsing, filtering, and inspecting raw data.
- **G6**: Enable ad-hoc SQL analysis via DuckDB on top of the raw layer.

## 4. Non-Goals (v0.1)

- Real-time streaming ingestion (batch is sufficient).
- User-facing auth / multi-tenant access control (single-user research context).
- Derived feature extraction or ML pipelines (future phase).
- Mobile app or native client.

## 5. Supported Devices

| Device | Ingestion Method | Auth | Data Types |
|---|---|---|---|
| **Fitbit** | OAuth API | OAuth 2.0 (Basic auth) | Heart rate, HRV, sleep, SpO2, activity, steps, calories, temperature, body, ECG, VO2max, breathing rate (20+ endpoints) |
| **Oura Ring** | OAuth API | OAuth 2.0 | Sleep, readiness, activity, stress, resilience, cardiovascular age, HRV, SpO2, workouts, sessions (15 endpoints) |
| **WHOOP** | OAuth API | OAuth 2.0 | Cycles, recovery, sleep, workouts, body measurements (6 endpoints) |
| **Google Fit** | OAuth API | OAuth 2.0 (offline) | Steps, heart rate, sleep, weight, blood pressure, blood glucose, SpO2, body temp, nutrition, location (20+ data types) |
| **Apple Health** | File Upload | N/A | All HealthKit record types and workouts from `export.zip` (XML) |
| **Garmin** | File Upload | N/A | FIT binary files: heart rate, GPS, cadence, power, sessions, laps, HRV |
| **Samsung Health** | File Upload | N/A | Export ZIP with CSV data: sleep, exercise, heart rate, steps, stress |
| **Health Connect** | File Upload | N/A | Android Health Connect JSON export: steps, heart rate, sleep, exercise, nutrition |
| **Xiaomi Mi Fitness** | File Upload | N/A | JSON export: steps, sleep, heart rate, SpO2, stress |
| **Polar / Suunto** | File Upload | N/A | TCX/CSV/GPX files: training sessions, laps, GPS tracks, heart rate zones |
| **Terra** | Webhook | API Key | Aggregated data from multiple wearable platforms via webhook |

## 6. Functional Requirements

### 6.1 Data Ingestion

- **FR-1**: OAuth flow (authorize → callback → token storage → auto-refresh) for Fitbit, Oura, WHOOP, Google Fit.
- **FR-2**: File upload endpoint accepting ZIP/XML/FIT/CSV/JSON/TCX/GPX for 6 file-based devices.
- **FR-3**: Webhook endpoint for Terra push data.
- **FR-4**: APScheduler cron jobs for automated daily pulls from all connected OAuth devices.
- **FR-5**: Manual sync endpoint (`POST /sync/{device}`) for on-demand pulls.

### 6.2 Data Storage

- **FR-6**: Store every API response / parsed record as a single JSONB row in `raw_payloads`.
- **FR-7**: SHA-256 content hashing on each payload for deduplication (`ON CONFLICT DO NOTHING`).
- **FR-8**: File-level deduplication via `file_uploads` table (same file hash = skip).
- **FR-9**: Ingestion logging in `ingestion_logs` table (job type, counts, errors, timestamps).

### 6.3 Query & Dashboard

- **FR-10**: REST API for listing, filtering, and inspecting raw payloads.
- **FR-11**: Dashboard stats endpoint (per-device counts, category breakdown, recent logs, OAuth status).
- **FR-12**: Vite + React dashboard with: overview page, payload browser with pagination, JSON detail viewer, device cards, ingestion log viewer.

## 7. Technical Requirements

- **TR-1**: Python 3.9+ (compatible with macOS system Python).
- **TR-2**: FastAPI + uvicorn for async HTTP.
- **TR-3**: asyncpg for non-blocking PostgreSQL access.
- **TR-4**: PostgreSQL 16 with JSONB and GIN index on payloads.
- **TR-5**: Vite + React + TypeScript + Recharts for the dashboard.
- **TR-6**: Docker Compose for PostgreSQL provisioning.
- **TR-7**: pydantic-settings for configuration via `.env`.

## 8. Data Model (Core Tables)

| Table | Purpose |
|---|---|
| `devices` | Registry of 11 supported devices (seeded on init) |
| `oauth_tokens` | OAuth access/refresh tokens per user×device |
| `raw_payloads` | **Core table** — JSONB payloads with content hash dedup |
| `file_uploads` | File-level dedup and processing status |
| `ingestion_logs` | Audit trail for every ingestion job |

### Key Indexes

- `(user_id, device_type)` — filter by device
- `(data_category)` — filter by category
- `(data_start_time)` — time range queries
- `(ingested_at DESC)` — recent data first
- `GIN(payload)` — JSONB containment queries

## 9. API Surface

| Method | Path | Description |
|---|---|---|
| GET | `/` | Health check + total payload count |
| GET | `/oauth/{device}/authorize` | Start OAuth flow |
| GET | `/oauth/{device}/callback` | OAuth callback handler |
| GET | `/oauth/status` | Check connected devices |
| POST | `/sync/{device}` | Manual data pull |
| POST | `/upload/{device}` | File upload |
| POST | `/webhook/terra` | Terra webhook receiver |
| GET | `/api/payloads` | List payloads (filtered, paginated) |
| GET | `/api/payload/{id}` | Single payload detail |
| GET | `/api/stats` | Dashboard summary stats |
| GET | `/api/categories` | Unique device×category list |

## 10. Success Metrics

- All 11 devices have working collectors.
- Zero field loss: raw_payloads.payload contains the complete original response.
- Deduplication rate > 0% on repeated syncs (proving hash dedup works).
- Dashboard loads and displays data within 2 seconds.
- System recovers gracefully from API rate limits and network errors.

## 11. Future Phases

- **Phase 2**: SQL Views for structured field extraction from JSONB.
- **Phase 3**: dbt transformation models for normalized analytics tables.
- **Phase 4**: DuckDB integration for local ad-hoc analysis.
- **Phase 5**: Multi-user support, research participant management.
- **Phase 6**: Alerting on ingestion failures, data freshness monitoring.
