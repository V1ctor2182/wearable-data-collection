# Raw Data Collection Plan — SEA Lab Wearable Device Pipeline

> **Goal**: 准确获取所有不同 device 的 raw data，实现 raw data 和 feature extraction 的分离
>
> **Last Updated**: 2026-03-11

---

## 1. 问题分析

### 1.1 当前数据覆盖率

| Device | HR | HRV | Sleep Stages | Steps | Workout Details | Biometrics | Route/GPS | 总覆盖率 |
|--------|:--:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Apple Health | ✅ | ⚠️ SDNN only | ✅ aggregated | ✅ | ❌ 10% | ❌ 0% | ❌ | ~40% |
| Fitbit | ✅ | ❌ | ✅ | ✅ | ❌ 20% | ❌ 0% | ❌ | ~35% |
| Garmin | ✅ | ❌ | N/A | N/A | ⚠️ 30% | ❌ | ❌ | ~25% |
| Google Fit | ✅ | ❌ | ❌ | ✅ daily only | ❌ 0% | ❌ | ❌ | ~25% |
| Health Connect | ✅ | ✅ | ✅ | ✅ | ⚠️ 50% | ❌ 0% | ❌ | ~50% |
| Oura | ✅ | ✅ | ✅ | ✅ | ❌ 0% | ❌ | N/A | ~55% |
| Polar/Suunto | ✅ | ❌ | N/A | N/A | ⚠️ 40% | ❌ | ❌ | ~30% |
| Samsung | ✅ | ❌ | ✅ | ✅ | ⚠️ 50% | ❌ | ❌ | ~50% |
| WHOOP | ✅ | ✅ | ✅ | ❌ | ⚠️ 70% | ❌ | N/A | ~55% |
| Xiaomi | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | N/A | ~55% |
| Terra | ✅ | ✅ | ✅ | ✅ | ⚠️ 70% | ✅ 90% | ❌ | ~85% |

**当前平均数据覆盖率: ~45%**

### 1.2 核心问题

1. **Raw data 和 derived data 混在一起**: Sleep parser 会把 sleep stage fragments 直接聚合成 `deep_minutes`，原始片段丢失
2. **大量 API endpoint 没有调用**: Fitbit 有 scope 但没调对应 endpoint (HRV, body composition, SpO2, breathing rate 等)
3. **Parser 只提取部分字段**: Garmin FIT file 有 cadence/power/GPS 但只提取了 HR 和 session summary
4. **没有 raw payload 存档**: 一旦 parsing 丢了数据，无法回溯
5. **Biometrics 在文件解析器中几乎全部缺失**: Apple Health, Health Connect 等有大量 biometric 数据但 parser 没提取

### 1.3 每个 Device 的具体数据丢失清单

#### Apple Health (File Parser)
- ❌ Biometrics 全部没 parse (SpO2, temperature, weight, body_fat, BMI, BP, glucose, respiratory_rate, VO2 max)
- ❌ Nutrition 数据没 parse (dietary energy, carbs, protein, fat, water, caffeine)
- ❌ Mobility 数据没 parse (walking asymmetry, walking speed, step length, stand time)
- ❌ Resting HR 判断不准 (靠 sourceName 字符串匹配 "Resting")
- ❌ Raw sleep stage fragments 被聚合后丢弃
- ❌ Workout 缺少 avg_hr, max_hr, elevation, route
- ❌ HRV 只提取 SDNN，没有 RMSSD
- ❌ Exercise time, active energy, basal energy 未提取
- ❌ Workout type mapping 不完整 (只有 8 种 → "other")
- ❌ Mindfulness/meditation sessions 未提取

#### Fitbit (OAuth Provider)
- ❌ HRV endpoint 未调用: `/1/user/-/hrv/date/{date}.json`
- ❌ Body composition 未调用: `/1/user/-/body/log/weight/date/{date}.json`
- ❌ SpO2 未调用: `/1/user/-/spo2/date/{date}.json`
- ❌ Breathing rate 未调用: `/1/user/-/br/date/{date}.json`
- ❌ Cardio score (VO2 Max) 未调用: `/1/user/-/cardioscore/date/{date}.json`
- ❌ Skin temperature 未调用: `/1/user/-/temp/skin/date/{date}.json`
- ❌ Sleep stages detail 未提取 (`session.levels.data[]` 有但没存)
- ❌ Workout list 未调用 (calories, distance, elevation 丢失)

#### Garmin (File Parser)
- ❌ `records[].cadence` — cadence RPM 全部丢弃
- ❌ `records[].power` — power watts 全部丢弃
- ❌ `records[].position_lat/lng` — GPS route 全部丢弃
- ❌ `records[].altitude` — altitude data 全部丢弃
- ❌ `records[].temperature` — 温度数据全部丢弃
- ❌ `records[].speed` — speed data 丢弃
- ❌ `sessions[].avg_cadence/max_cadence` — session-level cadence 丢弃
- ❌ `sessions[].avg_power/max_power/normalized_power` — power metrics 丢弃
- ❌ `sessions[].training_effect` — training effect 丢弃
- ❌ `laps[]` — per-lap segment data 完全丢弃
- ❌ Details JSONB 和 Route JSONB 列都存在但从未填充

#### Google Fit (OAuth Provider)
- ❌ Sleep stages 未调用: `com.google.sleep.segment` aggregation
- ❌ Workouts/sessions 未提取 (endpoint 存在但没 parse activity sessions)
- ❌ 所有 biometrics 未调用: SpO2, temperature, weight, body_fat, BP, glucose
- ❌ Intraday steps 未提取 (只有 daily aggregation)
- ❌ OAuth scopes 需要扩展 (只有 activity, heart_rate, sleep)

#### Health Connect (File Parser)
- ❌ Biometrics 全部未 parse: OxygenSaturation, BodyTemperature, Weight, BodyFat
- ❌ Workout calories 和 distance 被丢弃
- ❌ Confidence/quality metadata 被丢弃
- ❌ Steps 只提取 daily count, 丢弃 time-of-day distribution

#### Oura (OAuth Provider)
- ❌ Workouts endpoint 未调用: `/v2/usercollection/workout`
- ❌ Readiness endpoint 未调用: `/v2/usercollection/daily_readiness`
- ❌ Daily SpO2 未调用: `/v2/usercollection/daily_spo2`
- ❌ Daily Stress 未调用: `/v2/usercollection/daily_stress`
- ❌ Daily Resilience 未调用: `/v2/usercollection/daily_resilience`
- ❌ Activity breakdown 未提取 (calorie_burn, met_min, class_5_min, non_wear)
- ❌ Sleep phase detail (sleep_phase_5_min string) 未解析成 raw stages

#### Samsung (File Parser)
- ❌ Workout max/min heart rate 在 CSV 中有但没提取
- ❌ Sleep stage durations 存在但 parser 没存入 DB (sleep CSV 有 deep/light/rem/awake 但当前 INSERT 只有 duration+efficiency)
- ❌ Device model 信息丢失
- ❌ Biometrics CSV (如果存在) 没有识别和解析

#### Polar/Suunto (File Parser)
- ❌ TCX Extensions (power, running dynamics) 完全忽略
- ❌ GPS route data (Trackpoint.Position + Altitude) 丢弃
- ❌ Per-lap segment data 丢弃 (只读第一个 Lap)
- ❌ Cadence data 丢弃

#### WHOOP (OAuth Provider)
- ❌ Cycles endpoint 未调用: `/developer/v1/cycle`
- ❌ Workout strain score 未提取
- ❌ Recovery score 未作为 daily summary 存储
- ❌ Sleep need/performance 未提取
- ❌ Detailed recovery contributors 未提取

#### Xiaomi (File Parser)
- ❌ Workout data 完全没有 (如果 export 中有)
- ❌ Biometrics 没有 (SpO2 etc. if available)
- ❌ 没有 timezone normalization (默认 UTC)

#### Terra (Webhook Provider)
- ❌ Activity lap/split data 未 parse
- ❌ Daily webhook 只提取 steps + resting HR, 丢弃其他 daily metrics
- ❌ Body webhook 缺少 biometrics 标准化插入 (SpO2, temperature, weight 等虽有代码结构但实际没插入 biometrics 表)
- ❌ Raw payload 没有存档

---

## 2. 架构设计

### 2.1 三层数据架构

```
┌─────────────────────────────────────────────────────────┐
│                   Layer 1: Raw Payload Archive           │
│  raw_data_payloads (JSONB)                               │
│  - 完整 API response / parsed file 的 JSON 存档          │
│  - SHA-256 content hash 去重                             │
│  - 目的: 永远不丢数据, 支持回溯重新提取                    │
└───────────────────────┬─────────────────────────────────┘
                        │ extraction
┌───────────────────────▼─────────────────────────────────┐
│                   Layer 2: Structured Raw Tables          │
│  raw_sleep_stages, raw_activity_samples,                 │
│  raw_daily_summaries, biometrics (expanded)               │
│  - Device 最大粒度的结构化数据                             │
│  - 不做任何聚合, 保留 original labels                     │
│  - 目的: 让 researcher 可以直接 query raw data            │
└───────────────────────┬─────────────────────────────────┘
                        │ aggregation (ETL)
┌───────────────────────▼─────────────────────────────────┐
│                   Layer 3: Aggregated Features            │
│  (现有表: sleep_sessions, heart_rate_daily, etc.)          │
│  - Dashboard / API 用的聚合数据                           │
│  - 由 ETL service 从 Layer 2 计算                        │
│  - 目的: 快速查询, backward compatible                    │
└─────────────────────────────────────────────────────────┘
```

### 2.2 新增 DB Tables

#### `raw_data_payloads` — Raw Payload 存档
```sql
CREATE TABLE raw_data_payloads (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    source_id       UUID NOT NULL REFERENCES data_sources(id),
    payload_type    VARCHAR(50) NOT NULL,  -- 'oauth_api_response' | 'file_parsed_json' | 'webhook'
    device_type     VARCHAR(50) NOT NULL,  -- 'apple' | 'fitbit' | 'garmin' | ...
    payload_date    DATE NOT NULL,
    original_filename VARCHAR(255),
    payload_content JSONB NOT NULL,
    payload_size_bytes INTEGER,
    content_hash    VARCHAR(64),           -- SHA-256 for dedup
    api_endpoint    VARCHAR(255),
    api_response_code INTEGER,
    processed       BOOLEAN DEFAULT FALSE,
    extraction_version INTEGER DEFAULT 1,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
-- UNIQUE on content_hash to deduplicate
CREATE UNIQUE INDEX idx_raw_payloads_hash ON raw_data_payloads(content_hash) WHERE content_hash IS NOT NULL;
```

#### `raw_sleep_stages` — 睡眠阶段原始片段
```sql
CREATE TABLE raw_sleep_stages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    source_id       UUID NOT NULL REFERENCES data_sources(id),
    session_id      UUID REFERENCES sleep_sessions(id),
    stage           VARCHAR(20) NOT NULL,   -- 'awake','light','deep','rem','unknown'
    start_time      TIMESTAMPTZ NOT NULL,
    end_time        TIMESTAMPTZ NOT NULL,
    duration_seconds INTEGER NOT NULL,
    original_stage_label VARCHAR(100),       -- Device-native label
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, source_id, start_time, stage)
);
```

#### `raw_activity_samples` — 运动时序数据 (per-second)
```sql
CREATE TABLE raw_activity_samples (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    source_id       UUID NOT NULL REFERENCES data_sources(id),
    workout_id      UUID REFERENCES workouts(id),
    timestamp       TIMESTAMPTZ NOT NULL,
    heart_rate      SMALLINT,
    cadence_rpm     SMALLINT,
    power_watts     SMALLINT,
    speed_kmh       REAL,
    distance_meters REAL,
    altitude_meters REAL,
    lat             DOUBLE PRECISION,
    lng             DOUBLE PRECISION,
    temperature_celsius REAL,
    ground_contact_time_ms SMALLINT,
    vertical_oscillation_cm REAL,
    stride_length_meters REAL,
    stroke_count    SMALLINT,
    swolf           SMALLINT,
    lap_number      SMALLINT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, source_id, workout_id, timestamp)
);
```

#### `raw_daily_summaries` — Device 计算的每日指标
```sql
CREATE TABLE raw_daily_summaries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    source_id       UUID NOT NULL REFERENCES data_sources(id),
    date            DATE NOT NULL,
    summary_type    VARCHAR(50) NOT NULL,   -- 'readiness','recovery','strain','sleep_score','stress','resilience'
    value           REAL NOT NULL,
    metadata        JSONB,                  -- Device-specific contributors/breakdown
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, source_id, date, summary_type)
);
```

#### `biometrics` 表 — 扩展 metric_type enum
```
新增: hrv_daily, breathing_rate, skin_temperature, skin_temperature_relative,
      stress_level, body_water_percent, muscle_mass, bone_mass,
      dietary_energy, dietary_carbohydrates, dietary_protein, dietary_fat, dietary_water, dietary_caffeine,
      walking_asymmetry, walking_speed, walking_step_length, walking_heart_rate_avg,
      heart_rate_recovery, exercise_time, active_energy, basal_energy, stand_time,
      uv_exposure, noise_exposure, menstrual_flow
```

---

## 3. Implementation Plan

### Phase 1: Raw Payload Archive 基础设施 (2-3 天)

**目标**: 让所有数据源在处理前先存档原始数据

**文件改动**:

| 文件 | 改动 |
|------|------|
| `backend/migrations/013_raw_data_archive.sql` | 新建 `raw_data_payloads` 表 + index |
| `backend/src/services/fileProcessingService.ts` | 新增 `saveRawPayloadArchive()` 函数 |
| `backend/src/parsers/appleHealth.ts` | XML parse 后立即 archive |
| `backend/src/parsers/garmin.ts` | FIT parse callback 内 archive |
| `backend/src/parsers/samsung.ts` | 所有 CSV 预读后合并 archive |
| `backend/src/parsers/healthConnect.ts` | 所有 JSON 预读后合并 archive |
| `backend/src/parsers/xiaomi.ts` | JSON.parse 后立即 archive |
| `backend/src/parsers/polarSuunto.ts` | TCX XML parse 后 archive |
| `backend/src/providers/fitbit.ts` | 每个 API call response archive |
| `backend/src/providers/googlefit.ts` | 每个 API call response archive |
| `backend/src/providers/oura.ts` | 每个 API call response archive |
| `backend/src/providers/whoop.ts` | 每个 API call response archive |
| `backend/src/providers/terra.ts` | 每个 webhook payload archive |

**关键实现细节**:
- `saveRawPayloadArchive()` 使用 SHA-256 content hash 去重
- 所有 archive 调用使用 `.catch()` 确保不阻塞主流程
- payload_size 限制: 单个 payload 超过 50MB 时只存 metadata + truncated sample

---

### Phase 2: Structured Raw Tables + Repository (2-3 天)

**目标**: 创建结构化原始数据表和对应的 repository 方法

**文件改动**:

| 文件 | 改动 |
|------|------|
| `backend/migrations/014_structured_raw_tables.sql` | 新建 `raw_sleep_stages`, `raw_activity_samples`, `raw_daily_summaries` 表; 扩展 biometrics metric_type |
| `backend/src/repositories/healthDataRepository.ts` | 新增 interfaces: `RawSleepStageRecord`, `RawActivitySampleRecord`, `RawDailySummaryRecord`; 新增 methods: `insertRawSleepStageBatch()`, `insertActivitySampleBatch()`, `insertDailySummary()`, `insertDailySummaryBatch()` + 对应 query methods |

---

### Phase 3: 扩展每个 Device 的数据覆盖 (5-7 天)

这是最大的 phase。按 device 分组:

#### 3A. Apple Health Parser 扩展

**文件**: `backend/src/parsers/appleHealth.ts`

| 新增提取 | HK Type | 存入表 |
|----------|---------|--------|
| Nutrition 6 种 | DietaryEnergyConsumed, DietaryCarbohydrates, DietaryProtein, DietaryFatTotal, DietaryWater, DietaryCaffeine | biometrics |
| Mobility 4 种 | WalkingAsymmetryPercentage, WalkingSpeed, WalkingStepLength, AppleStandTime | biometrics |
| Resting HR | RestingHeartRate | heart_rate (resting_hr=true) |
| Walking HR Avg | WalkingHeartRateAverage | biometrics |
| HR Recovery | HeartRateRecoveryOneMinute | biometrics |
| Exercise Time | AppleExerciseTime | biometrics |
| Active Energy | ActiveEnergyBurned | biometrics |
| Basal Energy | BasalEnergyBurned | biometrics |
| Mindfulness | MindfulSession | workouts (type='meditation') |
| UV Exposure | UVExposure | biometrics |
| Noise Exposure | EnvironmentalAudioExposure | biometrics |
| Menstrual Flow | MenstrualFlow | biometrics |
| Raw Sleep Stages | SleepAnalysis fragments | raw_sleep_stages (不再只聚合) |
| Workout type mapping | 扩展 8→20+ 种 | workouts.type |

#### 3B. Fitbit Provider 扩展

**文件**: `backend/src/providers/fitbit.ts`

| 新增方法 | API Endpoint | 存入表 |
|----------|-------------|--------|
| `fetchHRV()` | `/1/user/-/hrv/date/{date}.json` | hrv + biometrics(hrv_daily) |
| `fetchBreathingRate()` | `/1/user/-/br/date/{date}.json` | biometrics(breathing_rate) |
| `fetchCardioScore()` | `/1/user/-/cardioscore/date/{date}.json` | biometrics(vo2_max) |
| `fetchSkinTemperature()` | `/1/user/-/temp/skin/date/{date}.json` | biometrics(skin_temperature_relative) |
| `fetchBodyComposition()` | `/1/user/-/body/log/weight/date/{date}.json` | biometrics(weight, body_fat_percent, bmi) |
| `fetchSpO2()` | `/1/user/-/spo2/date/{date}.json` | biometrics(spo2) |
| Sleep stages detail | `session.levels.data[]` (已在 response 中) | raw_sleep_stages |
| `fetchWorkouts()` | `/1/user/-/activities/list.json` | workouts (补充 calories, distance, elevation) |

#### 3C. Garmin Parser 扩展

**文件**: `backend/src/parsers/garmin.ts`

| 新增提取 | FIT Field | 存入表 |
|----------|-----------|--------|
| Cadence from records | `records[].cadence` | raw_activity_samples |
| Power from records | `records[].power` | raw_activity_samples |
| GPS from records | `records[].position_lat/lng` | raw_activity_samples |
| Altitude from records | `records[].altitude` | raw_activity_samples |
| Speed from records | `records[].speed` | raw_activity_samples |
| Temperature from records | `records[].temperature` | raw_activity_samples |
| Session power metrics | `sessions[].avg_power/max_power/normalized_power` | workouts.details JSONB |
| Session cadence | `sessions[].avg_cadence/max_cadence` | workouts.details JSONB |
| Training effect | `sessions[].training_effect` | workouts.details JSONB |
| Laps | `laps[]` array | workouts.details JSONB |
| Route polyline | Aggregate GPS points | workouts.route JSONB |

#### 3D. Google Fit Provider 扩展

**文件**: `backend/src/providers/googlefit.ts`

| 新增方法 | API 调用 | 存入表 |
|----------|---------|--------|
| `fetchSleepStages()` | POST aggregate `com.google.sleep.segment` | raw_sleep_stages |
| `fetchWorkouts()` | GET sessions (非 sleep activityType) | workouts |
| `fetchWeight()` | POST aggregate `com.google.weight` | biometrics |
| `fetchBodyFat()` | POST aggregate `com.google.body.fat.percentage` | biometrics |
| OAuth scopes 扩展 | 添加 `fitness.body.read`, `fitness.oxygen_saturation.read` | — |

#### 3E. Health Connect Parser 扩展

**文件**: `backend/src/parsers/healthConnect.ts`

| 新增提取 | JSON Type | 存入表 |
|----------|-----------|--------|
| OxygenSaturation | `OxygenSaturation[].percentage` | biometrics(spo2) |
| BodyTemperature | `BodyTemperature[].temperature` | biometrics(temperature) |
| Weight | `Weight[].weight` | biometrics(weight) |
| BodyFat | `BodyFat[].percentage` | biometrics(body_fat_percent) |
| Workout calories | `ExerciseSession[].energy` | workouts.calories_burned |
| Workout distance | `ExerciseSession[].distance` | workouts.distance_meters |

#### 3F. Oura Provider 扩展

**文件**: `backend/src/providers/oura.ts`

| 新增方法 | API Endpoint | 存入表 |
|----------|-------------|--------|
| `fetchReadiness()` | `/v2/usercollection/daily_readiness` | raw_daily_summaries(readiness) |
| `fetchDailySpo2()` | `/v2/usercollection/daily_spo2` | biometrics(spo2) |
| `fetchDailyStress()` | `/v2/usercollection/daily_stress` | raw_daily_summaries(stress) |
| `fetchDailyResilience()` | `/v2/usercollection/daily_resilience` | raw_daily_summaries(resilience) |
| `fetchWorkouts()` | `/v2/usercollection/workout` | workouts |
| Sleep raw stages | 解析 `sleep_phase_5_min` string | raw_sleep_stages |
| Activity breakdown | `daily_activity` 的 calorie/met/non_wear | raw_daily_summaries + biometrics |

#### 3G. Samsung Parser 修复

**文件**: `backend/src/parsers/samsung.ts`

| 修复 | 改动 |
|------|------|
| Sleep stages | 恢复 deep/light/rem/awake_minutes 的 INSERT (当前 SQL 缺少这些列) |
| Workout HR | 提取 max_heart_rate, min_heart_rate, avg_heart_rate |
| Biometrics CSV | 识别并解析 biometric 相关的 CSV 文件 |

#### 3H. Polar/Suunto Parser 扩展

**文件**: `backend/src/parsers/polarSuunto.ts`

| 新增提取 | TCX Element | 存入表 |
|----------|-------------|--------|
| GPS route | `Trackpoint.Position + AltitudeMeters` | raw_activity_samples |
| All laps | `Activity.Lap[]` (不只是第一个) | workouts.details JSONB |
| Extensions | Power, cadence from `Extensions` | raw_activity_samples |
| Cadence | `Trackpoint.Cadence` | raw_activity_samples |

#### 3I. WHOOP Provider 扩展

**文件**: `backend/src/providers/whoop.ts`

| 新增方法 | API Endpoint | 存入表 |
|----------|-------------|--------|
| `fetchCycles()` | `/developer/v1/cycle` | raw_daily_summaries(strain) |
| Recovery score storage | 从现有 `fetchRecovery()` 扩展 | raw_daily_summaries(recovery) |
| Workout strain | 从 `fetchWorkouts()` 扩展 | workouts.details JSONB |
| Sleep need/performance | 从 `fetchSleep()` 扩展 | raw_daily_summaries(sleep_score) |

#### 3J. Xiaomi Parser 扩展

**文件**: `backend/src/parsers/xiaomi.ts`

| 新增 | 改动 |
|------|------|
| Timezone normalization | 使用 `data.timezone` 字段做 offset |
| Workout parsing | 检查并解析 `data.data.workouts` (if exists) |
| SpO2 parsing | 检查并解析 `data.data.spo2` (if exists) |

#### 3K. Terra Provider 扩展

**文件**: `backend/src/providers/terra.ts`

| 改动 | 详情 |
|------|------|
| Body biometrics | 完善 body webhook: 插入 SpO2, temperature, weight, body_fat, BMI, BP, glucose, respiratory_rate 到 biometrics 表 |
| Daily metrics | 扩展 daily webhook: 提取 calories, active_minutes, distance, 等 |
| Activity details | 提取 lap/split data (如果存在) |

---

### Phase 4: Aggregation ETL Service (3-4 天)

**目标**: 将聚合逻辑从 parsers 中抽离到独立 ETL service

**文件改动**:

| 文件 | 改动 |
|------|------|
| `backend/src/services/aggregationETLService.ts` | **新建**: 从 raw tables 计算 aggregated features |

**ETL 方法设计**:

```typescript
class AggregationETLService {
  // 从 raw_sleep_stages 计算 sleep_sessions 的 deep/light/rem/awake_minutes
  async aggregateSleepSession(userId: string, date: string): Promise<void>;

  // 从 raw_activity_samples 计算 workout summary (avg_hr, max_hr, route polyline)
  async aggregateWorkoutDetails(userId: string, workoutId: string): Promise<void>;

  // 从 raw_daily_summaries 更新 user_daily_health_summary
  async aggregateDailySummary(userId: string, date: string): Promise<void>;

  // Full re-aggregation (用于 extraction_version 升级后重新计算)
  async reAggregateAll(userId: string, daysBack: number): Promise<void>;
}
```

**现有聚合代码迁移**:
- `appleHealth.ts` 中的 `aggregateSleepSessions()` → ETL service
- 各 aggregation job 中的计算逻辑 → ETL service
- Parser/Provider 只负责写入 Layer 1 + Layer 2, 不再做聚合

---

### Phase 5: 更新文档和可视化 (1-2 天)

**文件改动**:

| 文件 | 改动 |
|------|------|
| `docs/architecture/data-mapping.html` | 更新可视化: 添加新的数据流 (三层架构), 新的 raw tables, 每个 device 新增的字段 |
| `docs/architecture/data-mapping.md` | 更新文字版 mapping |
| `docs/architecture/database-schema.md` | 添加新表的 schema 文档 |

---

## 4. 实施优先级

```
Week 1:  Phase 1 (raw payload archive) + Phase 2 (structured raw tables)
Week 2:  Phase 3A-3C (Apple Health, Fitbit, Garmin — 最大数据损失设备)
Week 3:  Phase 3D-3K (其余 devices)
Week 4:  Phase 4 (ETL service) + Phase 5 (docs)
```

### Quick Wins (可以在 Phase 1 之前立即做):
1. Samsung sleep parser 修复 (恢复 deep/light/rem/awake 列)
2. Fitbit `fetchWorkouts()` endpoint 已存在但数据提取不完整

---

## 5. Backward Compatibility 保证

- **所有改动都是 additive**: 不删除或修改现有表结构
- **现有 API endpoints 不变**: Dashboard 继续从 aggregated tables 读取
- **新 raw tables 是新增的**: 不影响现有数据
- **Parser/Provider 继续写入现有表**: 同时写入 raw tables
- **Migration 使用 `IF NOT EXISTS`**: 安全重复执行

---

## 6. 验证计划

| 验证项 | 方法 |
|--------|------|
| Raw payload 存档完整性 | 比较 archived payload size vs. original API response size |
| 数据不丢失 | 对比 raw_data_payloads 中的 field count vs. structured tables 中的 record count |
| 去重正确 | 上传同一文件两次, 验证 content_hash dedup |
| Backward compatible | 运行现有 aggregation queries, 验证结果不变 |
| 每个 device 覆盖率 | Unit test: mock data → parser → 验证所有 expected fields 被存储 |
| Performance | Archive 操作不应增加 >10% 的 processing time |
