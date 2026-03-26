# Wearable Data Pipeline — Architecture Document

**Version**: 0.1.0
**Last Updated**: 2026-03-11

---

## 1. Architecture Overview

The system follows a **three-tier raw-first architecture**: ingest everything as JSONB first, extract structured fields later via SQL views, and run ad-hoc analysis with DuckDB. This document covers the v0.1 implementation (Tier 1: raw ingestion + storage + dashboard).

### 1.1 Full System Architecture（含 FHIR 医院数据接入）

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    DATA SOURCES                                      │
│                                                                                      │
│  ┌─ Wearable OAuth ─┐  ┌─ Hospital EHR (FHIR) ──┐  ┌─ File Upload ─┐  ┌─Webhook─┐ │
│  │                   │  │                         │  │               │  │         │ │
│  │  Fitbit           │  │  Epic (MyChart)         │  │  Apple Health │  │  Terra  │ │
│  │  Oura Ring        │  │  Cerner (Oracle Health) │  │  Garmin (FIT) │  │         │ │
│  │  WHOOP            │  │  MEDITECH               │  │  Samsung      │  └────┬────┘ │
│  │  Google Fit       │  │  Veradigm (Allscripts)  │  │  Health Conn. │       │      │
│  │                   │  │  athenahealth            │  │  Xiaomi       │       │      │
│  │                   │  │  Any FHIR R4 Server      │  │  Polar/Suunto │       │      │
│  └────────┬──────────┘  └────────────┬────────────┘  └───────┬───────┘       │      │
│           │                          │                       │               │      │
│      OAuth 2.0               SMART on FHIR              File Parse        POST     │
│    (固定端点)               (OAuth 2.0 +                (本地解析)       (签名验证) │
│                          动态端点发现)                                              │
└───────────┼──────────────────┼───────────────────────────┼───────────────┼──────────┘
            │                  │                           │               │
            ▼                  ▼                           ▼               ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           INGESTION LAYER (Python / FastAPI)                          │
│                                                                                      │
│  ┌─────────────────────┐   ┌────────────────────────────┐   ┌──────────────────┐    │
│  │   OAuth Manager     │   │   FHIR Client              │   │  File Parsers    │    │
│  │                     │   │                            │   │                  │    │
│  │  - generate auth URL│   │  - .well-known/smart-      │   │  - ZIP → XML     │    │
│  │  - handle callback  │   │    configuration 发现       │   │  - FIT binary    │    │
│  │  - token refresh    │   │  - SMART on FHIR OAuth     │   │  - CSV parse     │    │
│  │  - CSRF state mgmt  │   │  - 多医院端点管理           │   │  - JSON parse    │    │
│  │                     │   │  - FHIR Bundle 分页         │   │  - TCX/GPX       │    │
│  │  4 providers:       │   │  - 资源类型遍历             │   │                  │    │
│  │  Fitbit, Oura,      │   │    Patient, Observation,   │   │  6 devices:      │    │
│  │  WHOOP, Google Fit  │   │    Condition, Medication,  │   │  Apple Health,   │    │
│  │                     │   │    Procedure, Immunization │   │  Garmin, Samsung, │    │
│  └──────────┬──────────┘   │    AllergyIntolerance,     │   │  Health Connect, │    │
│             │              │    DocumentReference       │   │  Xiaomi,         │    │
│             │              └──────────────┬─────────────┘   │  Polar/Suunto    │    │
│             │                             │                 └────────┬─────────┘    │
│             │                             │                          │              │
│             ▼                             ▼                          ▼              │
│  ┌──────────────────────── Collectors ──────────────────────────────────┐           │
│  │                                                                      │           │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │           │
│  │  │  fitbit.py   │  │  fhir.py     │  │apple_health.py│              │           │
│  │  │  oura.py     │  │              │  │  garmin.py    │              │           │
│  │  │  whoop.py    │  │  遍历 FHIR   │  │  samsung.py   │              │           │
│  │  │  google_fit.py│  │  Resources  │  │  ...          │              │           │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │           │
│  │         │                 │                  │                      │           │
│  │         ▼                 ▼                  ▼                      │           │
│  │  ┌──────────────────────────────────────────────────────┐          │           │
│  │  │            统一输出: list[RawPayload]                  │          │           │
│  │  │                                                      │          │           │
│  │  │  RawPayload(device_type, data_category, payload={})  │          │           │
│  │  └──────────────────────────┬───────────────────────────┘          │           │
│  └─────────────────────────────┼──────────────────────────────────────┘           │
│                                │                                                  │
│                                ▼                                                  │
│  ┌──────────────────────────────────────────────────────┐                         │
│  │              Payload Store (storage/payload_store.py) │                         │
│  │                                                      │                         │
│  │  RawPayload → json.dumps(sort_keys) → SHA-256 hash   │                         │
│  │  → INSERT INTO raw_payloads (payload JSONB)           │                         │
│  │  → ON CONFLICT (user, device, category, hash)         │                         │
│  │    DO NOTHING                                         │                         │
│  └──────────────────────────┬───────────────────────────┘                         │
│                             │                                                      │
│  ┌──────────────┐           │                                                      │
│  │  APScheduler │───────────┘  (cron: daily sync wearables + FHIR)                 │
│  └──────────────┘                                                                  │
└──────────────────────────────┬─────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              STORAGE LAYER                                           │
│                                                                                      │
│  ┌────────────────────────── PostgreSQL 16 ──────────────────────────────────┐       │
│  │                                                                           │       │
│  │  devices              oauth_tokens              raw_payloads              │       │
│  │  ┌──────────────┐    ┌──────────────────┐      ┌─────────────────────┐   │       │
│  │  │ device_type  │    │ (user, device)   │      │ payload (JSONB)     │   │       │
│  │  │              │    │  UNIQUE          │      │ content_hash (SHA)  │   │       │
│  │  │ 11 wearables │    │                  │      │                     │   │       │
│  │  │ + N FHIR     │    │ access_token     │      │ Fitbit JSON         │   │       │
│  │  │   hospitals  │    │ refresh_token    │      │ Oura JSON           │   │       │
│  │  │              │    │ expires_at       │      │ Apple Health XML→J  │   │       │
│  │  │ ingestion_   │    │ raw_token_resp   │      │ FHIR Resources      │   │       │
│  │  │ method:      │    │  (JSONB)         │      │  (Patient,          │   │       │
│  │  │ 'oauth'      │    │                  │      │   Observation,      │   │       │
│  │  │ 'file'       │    │ Fitbit tokens    │      │   Condition, ...)   │   │       │
│  │  │ 'fhir'       │    │ Oura tokens      │      │                     │   │       │
│  │  │ 'webhook'    │    │ FHIR tokens      │      │ GIN index           │   │       │
│  │  └──────────────┘    │  (per hospital)  │      └─────────────────────┘   │       │
│  │                       └──────────────────┘                                │       │
│  │                                                                           │       │
│  │  file_uploads              ingestion_logs                                 │       │
│  │  ┌──────────────┐         ┌──────────────────┐                           │       │
│  │  │ file_hash    │         │ job_type          │                           │       │
│  │  │ dedup        │         │ records_new       │                           │       │
│  │  │ status       │         │ records_duplicate │                           │       │
│  │  └──────────────┘         └──────────────────┘                           │       │
│  └───────────────────────────────────────────────────────────────────────────┘       │
│                                                                                      │
│  ┌──── DuckDB (Phase 4) ────┐                                                       │
│  │  Reads PG via pg_scan    │  跨设备 + 跨临床数据联合分析                             │
│  │  Wearable + FHIR joins   │  e.g. Fitbit HR + 医院 BP + Lab results                │
│  └──────────────────────────┘                                                       │
└──────────────────────────────┬──────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           PRESENTATION LAYER                                         │
│                                                                                      │
│  ┌──────── FastAPI (:8000) ────────┐     ┌──────── Vite + React (:5173) ────────┐   │
│  │                                 │     │                                       │   │
│  │  Wearable APIs:                 │     │  Overview (charts + stats)            │   │
│  │  /oauth/{device}/authorize      │     │  Payload Browser (filter + paginate)  │   │
│  │  /oauth/{device}/callback       │     │  JSON Detail Viewer (collapsible)     │   │
│  │  /sync/{device}                 │◄───►│  Device Cards (wearable + FHIR)       │   │
│  │  /upload/{device}               │proxy│  Ingestion Logs                       │   │
│  │                                 │     │                                       │   │
│  │  FHIR APIs:                     │     │  FHIR-specific:                       │   │
│  │  /oauth/fhir:{hospital}/auth    │     │  Hospital Picker (搜索+连接医院)       │   │
│  │  /oauth/fhir:{hospital}/callback│     │  Clinical Data Timeline               │   │
│  │  /sync/fhir:{hospital}          │     │  Lab Results / Medications View       │   │
│  │                                 │     │                                       │   │
│  │  Query APIs:                    │     │                                       │   │
│  │  /api/payloads                  │     │                                       │   │
│  │  /api/stats                     │     │                                       │   │
│  │  /api/categories                │     │                                       │   │
│  └─────────────────────────────────┘     └───────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 FHIR 数据接入流程（SMART on FHIR）

```
┌───────────┐         ┌──────────────────┐         ┌─────────────────┐       ┌──────────────┐
│           │  Step 1  │                  │  Step 2  │                 │       │              │
│  用户/App  │────────►│ 发现 FHIR 端点    │────────►│ 医院 OAuth 授权  │       │ FHIR 资源服务器│
│           │         │                  │         │                 │       │              │
└─────┬─────┘         └──────────────────┘         └────────┬────────┘       └──────┬───────┘
      │                                                      │                      │
      │               GET /.well-known/                      │                      │
      │               smart-configuration                    │                      │
      │                                                      │                      │
      │               返回:                                   │                      │
      │               - authorization_endpoint               │                      │
      │               - token_endpoint                       │                      │
      │               - scopes_supported                     │                      │
      │                                                      │                      │
      │                              ┌───────────────────────┘                      │
      │                              │                                              │
      │                              ▼                                              │
      │               ┌──────────────────────────┐                                  │
      │               │  Step 3: 用户登录 MyChart  │                                  │
      │               │                          │                                  │
      │               │  - 输入患者门户用户名密码   │                                  │
      │               │  - 审查请求的数据范围       │                                  │
      │               │  - 点击「允许」授权         │                                  │
      │               └────────────┬─────────────┘                                  │
      │                            │                                                │
      │                            ▼                                                │
      │               ┌──────────────────────────┐                                  │
      │    Step 4      │  回调 + Token Exchange    │                                  │
      │◄──────────────│                          │                                  │
      │   code →       │  code → access_token     │                                  │
      │   token        │  + refresh_token         │                                  │
      │                │  + patient ID            │                                  │
      │                └──────────────────────────┘                                  │
      │                                                                              │
      │                         Step 5: 用 Token 拉取 FHIR 数据                       │
      │─────────────────────────────────────────────────────────────────────────────►│
      │                                                                              │
      │  GET /Patient/{id}                          ──► 患者基本信息                   │
      │  GET /Observation?patient={id}&category=lab ──► 检验结果 (血检/尿检)           │
      │  GET /Observation?patient={id}&category=vital──► 生命体征 (BP/HR/SpO2)        │
      │  GET /Condition?patient={id}                ──► 诊断 (ICD-10)                │
      │  GET /MedicationRequest?patient={id}        ──► 用药处方                      │
      │  GET /Procedure?patient={id}                ──► 手术/操作记录                  │
      │  GET /Immunization?patient={id}             ──► 免疫接种                      │
      │  GET /AllergyIntolerance?patient={id}       ──► 过敏信息                      │
      │  GET /DocumentReference?patient={id}        ──► 临床笔记 (出院小结等)          │
      │◄────────────────────────────────────────────────────────────────────────────│
      │                                                                              │
      │                         FHIR Bundle (JSON)                                    │
      │                              │                                                │
      │                              ▼                                                │
      │               ┌──────────────────────────┐                                    │
      │               │  FHIRCollector            │                                    │
      │               │                          │                                    │
      │               │  每种 Resource Type       │                                    │
      │               │  → 1 个 RawPayload        │                                    │
      │               │  → SHA-256 去重           │                                    │
      │               │  → INSERT JSONB           │                                    │
      │               └──────────────────────────┘                                    │
      │                                                                                │
```

### 1.3 数据统一存储模型

所有数据源（可穿戴设备 + 医院 FHIR）共享同一个 `raw_payloads` 表：

```
raw_payloads (JSONB-first, 统一存储)
─────────────────────────────────────────────────────────────────────────
 来源              device_type          data_category       payload (JSONB)
─────────────────────────────────────────────────────────────────────────
 Fitbit            fitbit               heart_rate          {"activities-heart": [...]}
 Fitbit            fitbit               sleep               {"sleep": [{...}]}
 Oura              oura                 daily_sleep         {"data": [{...}]}
 Apple Health      apple_health         HKQuantity_HR       [{"type": "HKQuantity...", ...}]
 Garmin            garmin               session             {"sport": "running", ...}
─────────────────────────────────────────────────────────────────────────
 Epic (NYP)        fhir:epic_nyp        Patient             {"resourceType": "Patient", ...}
 Epic (NYP)        fhir:epic_nyp        Observation_lab     {"resourceType": "Bundle", "entry": [...]}
 Epic (NYP)        fhir:epic_nyp        Observation_vital   {"resourceType": "Bundle", "entry": [...]}
 Epic (NYP)        fhir:epic_nyp        Condition           {"resourceType": "Bundle", "entry": [...]}
 Epic (NYP)        fhir:epic_nyp        MedicationRequest   {"resourceType": "Bundle", "entry": [...]}
 Cerner (JHU)      fhir:cerner_jhu      Patient             {"resourceType": "Patient", ...}
 Cerner (JHU)      fhir:cerner_jhu      Observation_lab     {"resourceType": "Bundle", "entry": [...]}
─────────────────────────────────────────────────────────────────────────

同一个 user_id 可以同时拥有:
  - Fitbit 可穿戴数据 (心率、睡眠、步数)
  - Oura 可穿戴数据 (HRV、睡眠、压力)
  - Epic NYP 医院数据 (检验、用药、诊断)
  - Cerner JHU 医院数据 (检验、用药、诊断)

→ Phase 4 DuckDB 可以跨所有数据源联合查询
  e.g. "Fitbit 静息心率 vs 医院血压记录 vs 实验室胆固醇" 的时间序列关联分析
```

## 2. Directory Structure

```
data-pipeline/
├── META/                          # Documentation
│   ├── PRD.md
│   ├── ARCHITECTURE.md            # ← 本文件
│   ├── fhir-data-access-research.md  # FHIR 接入研究
│   ├── fitbit-api-fields.md
│   ├── oura-api-fields.md
│   └── raw-data-collection-plan.md
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
│   │   └── manager.py             # OAuth 2.0 flows (4 wearable + FHIR)
│   ├── storage/
│   │   └── payload_store.py       # JSONB insert + SHA-256 dedup
│   ├── collectors/
│   │   ├── base.py                # (reserved for base class)
│   │   ├── fitbit.py              # 20+ API endpoints
│   │   ├── oura.py                # 15 V2 endpoints with pagination
│   │   ├── whoop.py               # 6 endpoints
│   │   ├── google_fit.py          # 20+ data types via aggregate
│   │   ├── fhir.py                # ★ FHIR R4: Patient, Observation, Condition, etc.
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
│       └── app.py                 # FastAPI: OAuth, upload, webhook, FHIR, query
├── dashboard/                     # Vite + React + TypeScript
│   ├── src/
│   │   ├── api.ts                 # API client (typed)
│   │   ├── App.tsx                # Router + sidebar layout
│   │   ├── pages/
│   │   │   ├── Overview.tsx       # Stats, charts, breakdown table
│   │   │   ├── Payloads.tsx       # Filtered payload list
│   │   │   ├── PayloadDetail.tsx  # Full JSON viewer
│   │   │   ├── Devices.tsx        # Device cards (wearable + FHIR)
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

### 4.4 FHIR Hospital Data (SMART on FHIR)

```
用户在 Dashboard 搜索医院（via ONC Lantern 端点目录或预置列表）
  → 点击「连接医院」
  → GET {hospital_fhir_base}/.well-known/smart-configuration → 获取 auth/token URL
  → 生成 SMART on FHIR 授权 URL (scope: patient/Patient.read patient/Observation.read ...)
  → 用户跳转到 MyChart / 患者门户登录
  → 用户授权后回调 /oauth/fhir:{hospital}/callback?code=...&state=...
  → 换取 access_token + refresh_token + patient ID
  → Tokens 存入 oauth_tokens (device_type = "fhir:{hospital_id}")

Cron 或手动 POST /sync/fhir:{hospital}:
  → get_valid_token() → auto-refresh if expired
  → FHIRCollector.collect() 遍历 9 种 FHIR Resources:
      Patient, Observation(lab), Observation(vital-signs),
      Condition, MedicationRequest, Procedure,
      Immunization, AllergyIntolerance, DocumentReference
  → 每种 Resource Type → 一个 RawPayload(device="fhir:epic_nyp", category="Observation_lab")
  → 处理 FHIR Bundle 分页 (next link)
  → store_payloads() → SHA-256 去重 → ingestion_logs
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
