# Wearable Data Pipeline — Architecture Document

**Version**: 0.1.0
**Last Updated**: 2026-03-11

---

## 1. Architecture Overview

The system follows a **three-tier raw-first architecture**: ingest everything as JSONB first, extract structured fields later via SQL views, and run ad-hoc analysis with DuckDB. This document covers the v0.1 implementation (Tier 1: raw ingestion + storage + dashboard).

```
┌──────────────────────────────────────────────────────────────────┐
│                        DATA SOURCES                              │
│                                                                  │
│   OAuth APIs          File Uploads           Webhooks            │
│   ┌─────────┐        ┌─────────────┐        ┌───────┐           │
│   │ Fitbit  │        │ Apple Health│        │ Terra │           │
│   │ Oura    │        │ Garmin      │        └───┬───┘           │
│   │ WHOOP   │        │ Samsung     │            │               │
│   │ Google  │        │ Health Conn.│            │               │
│   └────┬────┘        │ Xiaomi      │            │               │
│        │             │ Polar/Suunto│            │               │
│        │             └──────┬──────┘            │               │
└────────┼────────────────────┼───────────────────┼───────────────┘
         │                    │                   │
         ▼                    ▼                   ▼
┌──────────────────────────────────────────────────────────────────┐
│                    INGESTION LAYER (Python)                       │
│                                                                  │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────────┐      │
│  │ OAuth Manager│  │ File Parsers  │  │ Webhook Receiver │      │
│  │              │  │               │  │                  │      │
│  │ - auth URL   │  │ - ZIP → XML   │  │ - Terra POST     │      │
│  │ - callback   │  │ - FIT binary  │  │ - signature check│      │
│  │ - refresh    │  │ - CSV parse   │  │                  │      │
│  │ - CSRF state │  │ - JSON parse  │  │                  │      │
│  └──────┬───────┘  │ - TCX/GPX     │  └────────┬─────────┘      │
│         │          └───────┬───────┘            │               │
│         ▼                  ▼                    ▼               │
│  ┌──────────────────────────────────────────────────────┐       │
│  │              Payload Store                            │       │
│  │                                                      │       │
│  │  RawPayload → compute SHA-256 → INSERT ... JSONB     │       │
│  │              ON CONFLICT DO NOTHING RETURNING id      │       │
│  │                                                      │       │
│  └──────────────────────────┬───────────────────────────┘       │
│                             │                                    │
│  ┌──────────────┐           │                                    │
│  │  APScheduler │───────────┘  (cron + manual triggers)          │
│  └──────────────┘                                                │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                    STORAGE LAYER                                  │
│                                                                  │
│  ┌─────────────────── PostgreSQL 16 ──────────────────────┐     │
│  │                                                        │     │
│  │  devices           oauth_tokens        raw_payloads    │     │
│  │  ┌──────────┐     ┌─────────────┐     ┌────────────┐  │     │
│  │  │ 11 seed  │     │ access_token│     │ JSONB      │  │     │
│  │  │ devices  │     │ refresh     │     │ payload    │  │     │
│  │  │          │     │ expires_at  │     │ content_   │  │     │
│  │  │          │     │ raw_response│     │ hash (SHA) │  │     │
│  │  └──────────┘     └─────────────┘     │ GIN index  │  │     │
│  │                                       └────────────┘  │     │
│  │  file_uploads      ingestion_logs                      │     │
│  │  ┌──────────┐     ┌──────────────┐                    │     │
│  │  │ file_hash│     │ job_type     │                    │     │
│  │  │ dedup    │     │ counts       │                    │     │
│  │  │ status   │     │ error_msg    │                    │     │
│  │  └──────────┘     └──────────────┘                    │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
│  ┌──── DuckDB (future) ────┐                                    │
│  │  Reads PG via pg_scan   │                                    │
│  │  Ad-hoc SQL analysis    │                                    │
│  └─────────────────────────┘                                    │
└──────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                             │
│                                                                  │
│  ┌──── FastAPI ────┐          ┌──── Vite + React ────┐          │
│  │                 │          │                       │          │
│  │ /api/payloads   │◄────────►│ Overview (charts)     │          │
│  │ /api/stats      │  proxy   │ Payload Browser       │          │
│  │ /api/payload/id │  :5173   │ JSON Detail Viewer    │          │
│  │ /api/categories │──────────│ Device Cards          │          │
│  │                 │          │ Ingestion Logs        │          │
│  └─────────────────┘          └───────────────────────┘          │
└──────────────────────────────────────────────────────────────────┘
```

## 2. Directory Structure

```
data-pipeline/
├── META/                          # This folder — PRD + architecture docs
│   ├── PRD.md
│   └── ARCHITECTURE.md
├── docker-compose.yml             # PostgreSQL 16
├── pyproject.toml                 # Python deps (hatchling build)
├── .env                           # Secrets (gitignored)
├── .env.example                   # Template without secrets
├── start_all.sh / stop_all.sh     # One-command start/stop
├── scripts/
│   ├── init_db.py                 # Create tables + seed devices
│   ├── manual_sync.py             # CLI for manual device sync
│   └── run_server.py              # uvicorn launcher
├── src/wearable_pipeline/
│   ├── config.py                  # pydantic-settings (.env loader)
│   ├── db/
│   │   ├── connection.py          # asyncpg pool management
│   │   └── schema.sql             # DDL: 5 tables + indexes
│   ├── oauth/
│   │   └── manager.py             # OAuth 2.0 flows (4 providers)
│   ├── storage/
│   │   └── payload_store.py       # JSONB insert + SHA-256 dedup
│   ├── collectors/
│   │   ├── base.py                # (reserved for base class)
│   │   ├── fitbit.py              # 20+ API endpoints
│   │   ├── oura.py                # 15 V2 endpoints with pagination
│   │   ├── whoop.py               # 6 endpoints
│   │   ├── google_fit.py          # 20+ data types via aggregate
│   │   ├── apple_health.py        # ZIP → XML iterative parser
│   │   ├── garmin.py              # FIT binary via fitparse
│   │   ├── samsung.py             # ZIP → CSV classifier
│   │   ├── health_connect.py      # ZIP → JSON parser
│   │   ├── xiaomi.py              # JSON parser
│   │   ├── polar_suunto.py        # TCX/CSV/GPX (all laps + trackpoints)
│   │   └── terra.py               # Webhook payload processor
│   ├── scheduler/
│   │   └── jobs.py                # APScheduler cron + manual sync
│   └── api/
│       └── app.py                 # FastAPI: OAuth, upload, webhook, query
├── dashboard/                     # Vite + React + TypeScript
│   ├── src/
│   │   ├── api.ts                 # API client (typed)
│   │   ├── App.tsx                # Router + sidebar layout
│   │   ├── pages/
│   │   │   ├── Overview.tsx       # Stats, charts, breakdown table
│   │   │   ├── Payloads.tsx       # Filtered payload list
│   │   │   ├── PayloadDetail.tsx  # Full JSON viewer
│   │   │   ├── Devices.tsx        # 11 device cards + OAuth status
│   │   │   └── Logs.tsx           # Ingestion + upload logs
│   │   └── components/
│   │       ├── JsonViewer.tsx     # Recursive collapsible JSON
│   │       └── Loading.tsx        # Spinner + error box
│   └── vite.config.ts             # Dev proxy → FastAPI :8000
└── tests/                         # (placeholder)
```

## 3. Core Design Decisions

### 3.1 JSONB-First Storage (The "Raw Payload" Pattern)

**Decision**: Store the complete, unmodified API response or parsed file content as a single JSONB value in `raw_payloads.payload`.

**Rationale**:
- Device APIs add/remove/rename fields without notice. A column-per-field schema requires `ALTER TABLE` for every change.
- With JSONB, the pipeline never drops unknown fields. If Fitbit adds a new metric tomorrow, it's already captured.
- PostgreSQL GIN index enables efficient `@>` containment queries on JSONB.
- Extraction happens downstream via SQL views or dbt — if a field was missed in the view, the raw data is still there.

**Trade-off**: Larger storage footprint vs. complete data preservation. For a research project, data completeness is more valuable than storage efficiency.

### 3.2 SHA-256 Content Hashing for Deduplication

**Decision**: Each payload is hashed via `SHA-256(json.dumps(payload, sort_keys=True))`. The hash + user + device + category form a unique constraint.

**Rationale**:
- Cron jobs and manual syncs will often fetch the same data.
- Content-based dedup (not time-based) catches exact duplicates regardless of when they were fetched.
- `ON CONFLICT DO NOTHING` makes inserts idempotent with zero application-level locking.

### 3.3 File-Level Dedup

**Decision**: File uploads are deduplicated by `SHA-256(file_bytes)` before parsing.

**Rationale**: A user might re-upload the same Apple Health export or Garmin FIT file. Hashing the file prevents redundant processing.

### 3.4 Collector Architecture

**Decision**: Each device has its own collector module. OAuth devices accept `(pool, user_id)` and return `list[RawPayload]`. File devices accept `(file_path, user_id)`.

**Rationale**:
- Each device API is different enough that a shared base class adds complexity without reducing code.
- Collector output is always `list[RawPayload]` — the uniform interface is at the data level, not the code level.
- Each collector hits ALL available endpoints/categories, not just a predefined subset.

### 3.5 OAuth Token Management

**Decision**: Tokens stored in PostgreSQL with auto-refresh (5-minute buffer before expiry). CSRF protection via in-memory state tokens.

**Rationale**:
- Storing tokens in DB survives server restarts.
- `COALESCE(EXCLUDED.refresh_token, oauth_tokens.refresh_token)` preserves existing refresh tokens when providers don't return a new one on refresh.
- In-memory state is acceptable for single-server deployment. For production, switch to Redis.

### 3.6 PostgreSQL over NoSQL

**Decision**: Use PostgreSQL with JSONB rather than MongoDB or other document stores.

**Rationale**:
- PostgreSQL JSONB gives document-store flexibility with relational guarantees (ACID, indexes, joins).
- Future phases will add SQL views and dbt models — staying in PostgreSQL avoids a data copy step.
- GIN index provides efficient JSONB containment queries.
- The research team is already familiar with SQL.

## 4. Data Flow

### 4.1 OAuth Device Sync

```
User clicks /oauth/fitbit/authorize
  → Server generates state token + auth URL
  → User redirects to Fitbit login
  → Fitbit redirects back with ?code=...&state=...
  → Server exchanges code for tokens
  → Tokens stored in oauth_tokens (UPSERT)

Cron job fires (or manual POST /sync/fitbit):
  → get_valid_token() checks expiry, refreshes if needed
  → FitbitCollector.collect() calls 20+ endpoints
  → Each response becomes a RawPayload(device="fitbit", category="sleep", payload={...})
  → store_payloads() computes SHA-256, inserts with ON CONFLICT DO NOTHING
  → log_ingestion() writes summary to ingestion_logs
```

### 4.2 File Upload

```
POST /upload/apple_health with export.zip
  → Save to temp directory
  → compute_file_hash() for file-level dedup
  → Check file_uploads table → skip if duplicate
  → AppleHealthCollector.collect() parses ZIP → XML
  → Groups records by HKQuantityTypeIdentifier / HKCategoryTypeIdentifier
  → Batches of 500 records per RawPayload
  → store_payloads() → dedup → ingestion_logs
  → Clean up temp file
```

### 4.3 Terra Webhook

```
POST /webhook/terra with JSON body
  → TerraCollector.collect() stores complete payload
  → Also stores individual data items (activity, sleep, etc.) as separate payloads
  → store_payloads() → dedup → ingestion_logs
```

## 5. Security Considerations

- **Secrets Management**: API keys and OAuth secrets in `.env` file (gitignored). `.env.example` provides the template.
- **OAuth CSRF**: State tokens with 10-minute expiry prevent authorization code injection.
- **CORS**: Currently `allow_origins=["*"]` — acceptable for local development, must restrict in production.
- **No Authentication**: The API has no auth layer. Acceptable for single-user local research. Production requires JWT or API key auth.
- **Token Storage**: OAuth tokens stored as plaintext in PostgreSQL. Encrypt at rest for production.

## 6. Deployment

### Local Development

```bash
# 1. Start PostgreSQL
docker-compose up -d
# OR use local Postgres: createdb wearable_raw

# 2. Start API server
PYTHONPATH=src python3 scripts/run_server.py

# 3. Start dashboard
cd dashboard && npm run dev
```

### One-Command

```bash
./start_all.sh   # Starts PG + API + Dashboard
./stop_all.sh    # Stops everything
```

### Ports

| Service | Port | Description |
|---|---|---|
| PostgreSQL | 5432 | Database |
| FastAPI | 8000 | API server |
| Vite | 5173 | Dashboard (proxies /api → :8000) |

## 7. Future Architecture (Phases 2-4)

```
Phase 2: SQL Views
  raw_payloads.payload ->> 'heart_rate' → CREATE VIEW fitbit_heart_rate AS ...

Phase 3: dbt Models
  SQL Views → dbt staging → dbt marts (normalized, cross-device)

Phase 4: DuckDB Analysis
  DuckDB reads PG via postgres_scanner → notebooks / ad-hoc queries
```

The raw JSONB layer is permanent infrastructure. All downstream processing is additive — nothing modifies the raw data.

## 8. Dependencies

### Python (Backend)

| Package | Purpose |
|---|---|
| fastapi | Async web framework |
| uvicorn | ASGI server |
| asyncpg | Async PostgreSQL driver |
| httpx | Async HTTP client (OAuth + API calls) |
| apscheduler | Cron job scheduling |
| duckdb | Local OLAP analysis (future) |
| fitparse | Garmin FIT binary parser |
| lxml | Apple Health XML parser |
| pydantic-settings | .env configuration |
| python-multipart | File upload support |

### JavaScript (Dashboard)

| Package | Purpose |
|---|---|
| react + react-dom | UI framework |
| react-router-dom | Client-side routing |
| recharts | Charts (bar, pie) |
| date-fns | Date formatting |
| vite | Build tool + dev server |
| typescript | Type safety |
