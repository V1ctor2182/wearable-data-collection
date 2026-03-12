# Oura Ring API V2 — Field Reference

> Compares actual payload data vs official [Oura API V2 docs](https://cloud.ouraring.com/v2/docs).
>
> - ✅ **Payload** — field observed in collected data
> - 📄 **API Doc** — field documented in official API but not yet seen in payload (device may not have produced data)

---

## personal_info
- **Endpoint:** `GET /v2/usercollection/personal_info`
- **Scope:** `personal`
- **Status:** ✅ Has data
- **Docs:** https://cloud.ouraring.com/v2/docs#tag/Personal-Info

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| id | string | ✅ Payload | User ID |
| age | number | ✅ Payload | User age |
| weight | number | ✅ Payload | Weight (kg) |
| height | number | ✅ Payload | Height (m) |
| biological_sex | string | ✅ Payload | male/female |
| email | string | ✅ Payload | User email |

---

## daily_activity
- **Endpoint:** `GET /v2/usercollection/daily_activity`
- **Scope:** `daily`
- **Status:** Empty data (device hasn't produced data for queried period)
- **Docs:** https://cloud.ouraring.com/v2/docs#tag/Daily-Activity

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| id | string | 📄 API Doc | Document ID |
| day | string | 📄 API Doc | Date (YYYY-MM-DD) |
| score | number | 📄 API Doc | Activity score (0-100) |
| active_calories | number | 📄 API Doc | Active calories burned |
| total_calories | number | 📄 API Doc | Total calories burned |
| steps | number | 📄 API Doc | Total steps |
| equivalent_walking_distance | number | 📄 API Doc | Equivalent walking distance (m) |
| high_activity_met_minutes | number | 📄 API Doc | High activity MET minutes |
| medium_activity_met_minutes | number | 📄 API Doc | Medium activity MET minutes |
| low_activity_met_minutes | number | 📄 API Doc | Low activity MET minutes |
| sedentary_met_minutes | number | 📄 API Doc | Sedentary MET minutes |
| non_wear_minutes | number | 📄 API Doc | Non-wear time (minutes) |
| resting_time | number | 📄 API Doc | Resting time (seconds) |
| inactivity_alerts | number | 📄 API Doc | Number of inactivity alerts |
| target_calories | number | 📄 API Doc | Daily calorie target |
| target_meters | number | 📄 API Doc | Daily distance target (m) |
| met.interval | number | 📄 API Doc | MET interval (seconds) |
| met.items[] | number[] | 📄 API Doc | MET values per interval |
| met.timestamp | string | 📄 API Doc | MET series start time |
| class_5_min | string | 📄 API Doc | Activity classification per 5-min (encoded string) |
| timestamp | string | 📄 API Doc | ISO 8601 timestamp |
| contributors.meet_daily_targets | number | 📄 API Doc | Contributor score |
| contributors.move_every_hour | number | 📄 API Doc | Contributor score |
| contributors.recovery_time | number | 📄 API Doc | Contributor score |
| contributors.stay_active | number | 📄 API Doc | Contributor score |
| contributors.training_frequency | number | 📄 API Doc | Contributor score |
| contributors.training_volume | number | 📄 API Doc | Contributor score |

---

## daily_readiness
- **Endpoint:** `GET /v2/usercollection/daily_readiness`
- **Scope:** `daily`
- **Status:** Empty data
- **Docs:** https://cloud.ouraring.com/v2/docs#tag/Daily-Readiness

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| id | string | 📄 API Doc | Document ID |
| day | string | 📄 API Doc | Date (YYYY-MM-DD) |
| score | number | 📄 API Doc | Readiness score (0-100) |
| temperature_deviation | number | 📄 API Doc | Skin temp deviation from baseline |
| temperature_trend_deviation | number | 📄 API Doc | Temp trend deviation |
| timestamp | string | 📄 API Doc | ISO 8601 timestamp |
| contributors.activity_balance | number | 📄 API Doc | Contributor score |
| contributors.body_temperature | number | 📄 API Doc | Contributor score |
| contributors.hrv_balance | number | 📄 API Doc | Contributor score |
| contributors.previous_day_activity | number | 📄 API Doc | Contributor score |
| contributors.previous_night | number | 📄 API Doc | Contributor score |
| contributors.recovery_index | number | 📄 API Doc | Contributor score |
| contributors.resting_heart_rate | number | 📄 API Doc | Contributor score |
| contributors.sleep_balance | number | 📄 API Doc | Contributor score |

---

## daily_sleep
- **Endpoint:** `GET /v2/usercollection/daily_sleep`
- **Scope:** `daily`
- **Status:** Empty data
- **Docs:** https://cloud.ouraring.com/v2/docs#tag/Daily-Sleep

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| id | string | 📄 API Doc | Document ID |
| day | string | 📄 API Doc | Date (YYYY-MM-DD) |
| score | number | 📄 API Doc | Sleep score (0-100) |
| timestamp | string | 📄 API Doc | ISO 8601 timestamp |
| contributors.deep_sleep | number | 📄 API Doc | Deep sleep contributor |
| contributors.efficiency | number | 📄 API Doc | Efficiency contributor |
| contributors.latency | number | 📄 API Doc | Latency contributor |
| contributors.rem_sleep | number | 📄 API Doc | REM sleep contributor |
| contributors.restfulness | number | 📄 API Doc | Restfulness contributor |
| contributors.timing | number | 📄 API Doc | Timing contributor |
| contributors.total_sleep | number | 📄 API Doc | Total sleep contributor |

---

## sleep
- **Endpoint:** `GET /v2/usercollection/sleep`
- **Scope:** `daily`
- **Status:** Empty data
- **Docs:** https://cloud.ouraring.com/v2/docs#tag/Sleep

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| id | string | 📄 API Doc | Document ID |
| day | string | 📄 API Doc | Date (YYYY-MM-DD) |
| bedtime_start | string | 📄 API Doc | Bedtime start (ISO 8601) |
| bedtime_end | string | 📄 API Doc | Bedtime end (ISO 8601) |
| total_sleep_duration | number | 📄 API Doc | Total sleep (seconds) |
| deep_sleep_duration | number | 📄 API Doc | Deep sleep (seconds) |
| rem_sleep_duration | number | 📄 API Doc | REM sleep (seconds) |
| light_sleep_duration | number | 📄 API Doc | Light sleep (seconds) |
| awake_time | number | 📄 API Doc | Awake time (seconds) |
| latency | number | 📄 API Doc | Sleep onset latency (seconds) |
| efficiency | number | 📄 API Doc | Sleep efficiency (0-100) |
| average_breath | number | 📄 API Doc | Average breathing rate |
| average_heart_rate | number | 📄 API Doc | Average heart rate |
| average_hrv | number | 📄 API Doc | Average HRV (ms) |
| lowest_heart_rate | number | 📄 API Doc | Lowest heart rate |
| time_in_bed | number | 📄 API Doc | Total time in bed (seconds) |
| type | string | 📄 API Doc | long_sleep / sleep / rest / nap |
| period | number | 📄 API Doc | Sleep period index |
| is_longest | boolean | 📄 API Doc | Whether this is the longest sleep |
| readiness_score_delta | number | 📄 API Doc | Contribution to readiness |
| heart_rate.interval | number | 📄 API Doc | HR interval (seconds) |
| heart_rate.items[] | number[] | 📄 API Doc | HR values per interval |
| heart_rate.timestamp | string | 📄 API Doc | HR series start time |
| hrv.interval | number | 📄 API Doc | HRV interval (seconds) |
| hrv.items[] | number[] | 📄 API Doc | HRV (rMSSD ms) per interval |
| hrv.timestamp | string | 📄 API Doc | HRV series start time |
| movement_30_sec | string | 📄 API Doc | Movement classification per 30s (encoded) |
| sleep_phase_5_min | string | 📄 API Doc | Sleep phase per 5-min (encoded) |
| sleep_algorithm_version | string | 📄 API Doc | Algorithm version |

---

## daily_spo2
- **Endpoint:** `GET /v2/usercollection/daily_spo2`
- **Scope:** `spo2`
- **Status:** Empty data
- **Docs:** https://cloud.ouraring.com/v2/docs#tag/Daily-SpO2

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| id | string | 📄 API Doc | Document ID |
| day | string | 📄 API Doc | Date (YYYY-MM-DD) |
| spo2_percentage.average | number | 📄 API Doc | Average SpO2 % |

---

## daily_stress
- **Endpoint:** `GET /v2/usercollection/daily_stress`
- **Scope:** `daily`
- **Status:** Empty data
- **Docs:** https://cloud.ouraring.com/v2/docs#tag/Daily-Stress

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| id | string | 📄 API Doc | Document ID |
| day | string | 📄 API Doc | Date (YYYY-MM-DD) |
| stress_high | number | 📄 API Doc | High stress minutes |
| recovery_high | number | 📄 API Doc | High recovery minutes |
| day_summary | string | 📄 API Doc | restored / normal / stressful |

---

## daily_resilience
- **Endpoint:** `GET /v2/usercollection/daily_resilience`
- **Scope:** `daily`
- **Status:** Empty data
- **Docs:** https://cloud.ouraring.com/v2/docs#tag/Daily-Resilience

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| id | string | 📄 API Doc | Document ID |
| day | string | 📄 API Doc | Date (YYYY-MM-DD) |
| level | string | 📄 API Doc | Resilience level |
| contributors.sleep_recovery | number | 📄 API Doc | Sleep recovery score (0-100) |
| contributors.daytime_recovery | number | 📄 API Doc | Daytime recovery score (0-100) |
| contributors.stress | number | 📄 API Doc | Stress score (0-100) |

---

## daily_cardiovascular_age
- **Endpoint:** `GET /v2/usercollection/daily_cardiovascular_age`
- **Scope:** `daily`
- **Status:** Empty data
- **Docs:** https://cloud.ouraring.com/v2/docs#tag/Daily-Cardiovascular-Age

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| id | string | 📄 API Doc | Document ID |
| day | string | 📄 API Doc | Date (YYYY-MM-DD) |
| vascular_age | number | 📄 API Doc | Estimated cardiovascular age (years) |

---

## heart_rate
- **Endpoint:** `GET /v2/usercollection/heartrate`
- **Scope:** `heartrate`
- **Status:** Empty data
- **Docs:** https://cloud.ouraring.com/v2/docs#tag/Heart-Rate
- **Note:** Uses `start_datetime` / `end_datetime` instead of date params

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| bpm | number | 📄 API Doc | Heart rate (beats per minute) |
| source | string | 📄 API Doc | awake / rest / sleep / workout / unspecified |
| timestamp | string | 📄 API Doc | ISO 8601 timestamp |

---

## workout
- **Endpoint:** `GET /v2/usercollection/workout`
- **Scope:** `workout`
- **Status:** Empty data
- **Docs:** https://cloud.ouraring.com/v2/docs#tag/Workout

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| id | string | 📄 API Doc | Document ID |
| activity | string | 📄 API Doc | Workout type (e.g. running, cycling) |
| calories | number | 📄 API Doc | Calories burned |
| day | string | 📄 API Doc | Date (YYYY-MM-DD) |
| distance | number | 📄 API Doc | Distance (meters) |
| start_datetime | string | 📄 API Doc | Start time (ISO 8601) |
| end_datetime | string | 📄 API Doc | End time (ISO 8601) |
| intensity | string | 📄 API Doc | easy / moderate / hard |
| label | string | 📄 API Doc | User label |
| source | string | 📄 API Doc | manual / autodetected / confirmed |

---

## session
- **Endpoint:** `GET /v2/usercollection/session`
- **Scope:** `session`
- **Status:** Empty data
- **Docs:** https://cloud.ouraring.com/v2/docs#tag/Session

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| id | string | 📄 API Doc | Document ID |
| day | string | 📄 API Doc | Date (YYYY-MM-DD) |
| start_datetime | string | 📄 API Doc | Start time (ISO 8601) |
| end_datetime | string | 📄 API Doc | End time (ISO 8601) |
| type | string | 📄 API Doc | breathing / meditation / nap / ... |
| mood | string | 📄 API Doc | bad / worse / same / better / good |
| motion_count.interval | number | 📄 API Doc | Motion count interval (seconds) |
| motion_count.items[] | number[] | 📄 API Doc | Motion count values |
| motion_count.timestamp | string | 📄 API Doc | Series start time |
| heart_rate.interval | number | 📄 API Doc | HR interval (seconds) |
| heart_rate.items[] | number[] | 📄 API Doc | HR values |
| heart_rate.timestamp | string | 📄 API Doc | HR series start time |
| heart_rate_variability.interval | number | 📄 API Doc | HRV interval (seconds) |
| heart_rate_variability.items[] | number[] | 📄 API Doc | HRV values (rMSSD ms) |
| heart_rate_variability.timestamp | string | 📄 API Doc | HRV series start time |

---

## sleep_time
- **Endpoint:** `GET /v2/usercollection/sleep_time`
- **Scope:** `daily`
- **Status:** Empty data
- **Docs:** https://cloud.ouraring.com/v2/docs#tag/Sleep-Time

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| id | string | 📄 API Doc | Document ID |
| day | string | 📄 API Doc | Date (YYYY-MM-DD) |
| optimal_bedtime.day_tz | number | 📄 API Doc | Timezone offset |
| optimal_bedtime.end_offset | number | 📄 API Doc | End offset from midnight (seconds) |
| optimal_bedtime.start_offset | number | 📄 API Doc | Start offset from midnight (seconds) |
| recommendation | string | 📄 API Doc | improve_efficiency / earlier_bedtime / ... |
| status | string | 📄 API Doc | not_enough_data / good_sleep / ... |

---

## vo2_max
- **Endpoint:** `GET /v2/usercollection/vo2_max`
- **Scope:** `daily`
- **Status:** Empty data
- **Docs:** https://cloud.ouraring.com/v2/docs#tag/VO2-Max

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| id | string | 📄 API Doc | Document ID |
| day | string | 📄 API Doc | Date (YYYY-MM-DD) |
| vo2_max | number | 📄 API Doc | VO2 max estimate (mL/min/kg) |

---

## ring_configuration
- **Endpoint:** `GET /v2/usercollection/ring_configuration`
- **Scope:** `personal`
- **Status:** Empty data (no date params)
- **Docs:** https://cloud.ouraring.com/v2/docs#tag/Ring-Configuration

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| id | string | 📄 API Doc | Document ID |
| color | string | 📄 API Doc | Ring color (e.g. glossy_black) |
| design | string | 📄 API Doc | Ring design (e.g. heritage) |
| firmware_version | string | 📄 API Doc | Firmware version |
| hardware_type | string | 📄 API Doc | Hardware type (gen3 / gen4) |
| set_up_at | string | 📄 API Doc | Setup timestamp |
| size | number | 📄 API Doc | Ring size |

---

## Not Originally Collected Endpoints (Newly Added)

### rest_mode_period
- **Endpoint:** `GET /v2/usercollection/rest_mode_period`
- **Scope:** `daily` (already requested)
- **Reason not collected:** Overlooked in initial implementation
- **Docs:** https://cloud.ouraring.com/v2/docs#tag/Rest-Mode-Period

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| id | string | 📄 API Doc | Document ID |
| start_day | string | 📄 API Doc | Start date (YYYY-MM-DD) |
| start_time | string | 📄 API Doc | Start time (ISO 8601) |
| end_day | string | 📄 API Doc | End date (YYYY-MM-DD) |
| end_time | string | 📄 API Doc | End time (ISO 8601) |
| episodes[].tags[] | string[] | 📄 API Doc | Episode tags |
| episodes[].timestamp | string | 📄 API Doc | Episode timestamp |

### enhanced_tag
- **Endpoint:** `GET /v2/usercollection/enhanced_tag`
- **Scope:** `tag` (not originally requested)
- **Reason not collected:** Requires `tag` OAuth scope which was not initially requested
- **Docs:** https://cloud.ouraring.com/v2/docs#tag/Enhanced-Tag

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| id | string | 📄 API Doc | Document ID |
| tag_type_code | string | 📄 API Doc | Tag type code |
| start_time | string | 📄 API Doc | Start time (ISO 8601) |
| end_time | string | 📄 API Doc | End time (ISO 8601) |
| start_day | string | 📄 API Doc | Start date |
| end_day | string | 📄 API Doc | End date |
| comment | string | 📄 API Doc | User comment |

### tag (Deprecated)
- **Endpoint:** `GET /v2/usercollection/tag`
- **Scope:** `tag` (not originally requested)
- **Reason not collected:** Deprecated endpoint, replaced by enhanced_tag. Requires `tag` OAuth scope.
- **Docs:** https://cloud.ouraring.com/v2/docs#tag/Tag

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| id | string | 📄 API Doc | Document ID |
| day | string | 📄 API Doc | Date (YYYY-MM-DD) |
| text | string | 📄 API Doc | Tag text |
| timestamp | string | 📄 API Doc | Timestamp |
| tags[] | string[] | 📄 API Doc | Tag values |
