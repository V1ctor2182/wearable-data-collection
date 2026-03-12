# Fitbit API Field Reference

Complete field comparison: actual payload data (✅) vs official API documentation (📄).

---

## heart_rate
**Endpoint:** `GET /1/user/-/activities/heart/date/{date}/1d/1sec.json`
**Status:** Has data
**Docs:** https://dev.fitbit.com/build/reference/web-api/heartrate-timeseries/

| Field | Type | Source |
|-------|------|--------|
| `activities-heart[].dateTime` | string | ✅ Payload |
| `activities-heart[].value.heartRateZones[].max` | number | ✅ Payload |
| `activities-heart[].value.heartRateZones[].min` | number | ✅ Payload |
| `activities-heart[].value.heartRateZones[].name` | string | ✅ Payload |
| `activities-heart[].value.heartRateZones[].minutes` | number | ✅ Payload |
| `activities-heart[].value.heartRateZones[].caloriesOut` | number | ✅ Payload |
| `activities-heart[].value.customHeartRateZones[]` | array | ✅ Payload |
| `activities-heart[].value.restingHeartRate` | number | 📄 API Doc |

---

## heart_rate_zones
**Endpoint:** `GET /1/user/-/activities/heart/date/{date}/1d.json`
**Status:** Has data
**Docs:** https://dev.fitbit.com/build/reference/web-api/heartrate-timeseries/

Same fields as heart_rate above.

---

## activity_summary
**Endpoint:** `GET /1/user/-/activities/date/{date}.json`
**Status:** Has data
**Docs:** https://dev.fitbit.com/build/reference/web-api/activity/

| Field | Type | Source |
|-------|------|--------|
| `goals.steps` | number | ✅ Payload |
| `goals.floors` | number | ✅ Payload |
| `goals.distance` | number | ✅ Payload |
| `goals.caloriesOut` | number | ✅ Payload |
| `goals.activeMinutes` | number | ✅ Payload |
| `summary.steps` | number | ✅ Payload |
| `summary.distances[].activity` | string | ✅ Payload |
| `summary.distances[].distance` | number | ✅ Payload |
| `summary.activeScore` | number | ✅ Payload |
| `summary.caloriesBMR` | number | ✅ Payload |
| `summary.caloriesOut` | number | ✅ Payload |
| `summary.heartRateZones[]` | array | ✅ Payload |
| `summary.activityCalories` | number | ✅ Payload |
| `summary.marginalCalories` | number | ✅ Payload |
| `summary.sedentaryMinutes` | number | ✅ Payload |
| `summary.veryActiveMinutes` | number | ✅ Payload |
| `summary.fairlyActiveMinutes` | number | ✅ Payload |
| `summary.lightlyActiveMinutes` | number | ✅ Payload |
| `activities[]` | array | ✅ Payload |
| `summary.elevation` | number | 📄 API Doc — Elevation gained in meters |
| `summary.floors` | number | 📄 API Doc — Floors climbed |
| `summary.restingHeartRate` | number | 📄 API Doc — Resting heart rate |
| `summary.useEstimation` | boolean | 📄 API Doc — Whether calorie estimation was used |
| `summary.caloriesOutUnestimated` | number | 📄 API Doc — Unestimated calories out |
| `summary.calorieEstimationMu` | number | 📄 API Doc — Calorie estimation MU |

---

## steps_intraday
**Endpoint:** `GET /1/user/-/activities/steps/date/{date}/1d/1min.json`
**Status:** Has data (daily aggregate only)
**Docs:** https://dev.fitbit.com/build/reference/web-api/intraday/

| Field | Type | Source |
|-------|------|--------|
| `activities-steps[].value` | string | ✅ Payload |
| `activities-steps[].dateTime` | string | ✅ Payload |
| `activities-steps-intraday.dataset[].time` | string | 📄 API Doc — HH:mm:ss per-minute |
| `activities-steps-intraday.dataset[].value` | number | 📄 API Doc — Steps in minute |
| `activities-steps-intraday.datasetInterval` | number | 📄 API Doc — Interval (1/5/15 min) |

---

## calories_intraday
**Endpoint:** `GET /1/user/-/activities/calories/date/{date}/1d/15min.json`
**Status:** Has data (daily aggregate only)
**Docs:** https://dev.fitbit.com/build/reference/web-api/intraday/

| Field | Type | Source |
|-------|------|--------|
| `activities-calories[].value` | string | ✅ Payload |
| `activities-calories[].dateTime` | string | ✅ Payload |
| `activities-calories-intraday.dataset[].time` | string | 📄 API Doc |
| `activities-calories-intraday.dataset[].value` | number | 📄 API Doc |
| `activities-calories-intraday.dataset[].level` | number | 📄 API Doc — Activity level (0-3) |
| `activities-calories-intraday.dataset[].mets` | number | 📄 API Doc — Metabolic equivalent |

---

## distance_intraday
**Endpoint:** `GET /1/user/-/activities/distance/date/{date}/1d/1min.json`
**Status:** Has data (daily aggregate only)
**Docs:** https://dev.fitbit.com/build/reference/web-api/intraday/

| Field | Type | Source |
|-------|------|--------|
| `activities-distance[].value` | string | ✅ Payload |
| `activities-distance[].dateTime` | string | ✅ Payload |
| `activities-distance-intraday.dataset[].time` | string | 📄 API Doc |
| `activities-distance-intraday.dataset[].value` | number | 📄 API Doc |

---

## profile
**Endpoint:** `GET /1/user/-/profile.json`
**Status:** Has data (30+ fields)
**Docs:** https://dev.fitbit.com/build/reference/web-api/user/

| Field | Type | Source |
|-------|------|--------|
| `user.age` | number | ✅ Payload |
| `user.gender` | string | ✅ Payload |
| `user.height` | number | ✅ Payload |
| `user.weight` | number | ✅ Payload |
| `user.fullName` | string | ✅ Payload |
| `user.firstName` | string | ✅ Payload |
| `user.lastName` | string | ✅ Payload |
| `user.displayName` | string | ✅ Payload |
| `user.encodedId` | string | ✅ Payload |
| `user.dateOfBirth` | string | ✅ Payload |
| `user.memberSince` | string | ✅ Payload |
| `user.timezone` | string | ✅ Payload |
| `user.locale` | string | ✅ Payload |
| `user.heightUnit` | string | ✅ Payload |
| `user.weightUnit` | string | ✅ Payload |
| `user.distanceUnit` | string | ✅ Payload |
| `user.sleepTracking` | string | ✅ Payload |
| `user.averageDailySteps` | number | ✅ Payload |
| `user.strideLengthRunning` | number | ✅ Payload |
| `user.strideLengthWalking` | number | ✅ Payload |
| `user.avatar` | string | ✅ Payload |
| `user.topBadges[]` | array | ✅ Payload |
| ... (20+ more ✅ fields) | | ✅ Payload |
| `user.aboutMe` | string | 📄 API Doc — User bio |
| `user.country` | string | 📄 API Doc |
| `user.state` | string | 📄 API Doc |
| `user.temperatureUnit` | string | 📄 API Doc |
| `user.waterUnit` | string | 📄 API Doc |
| `user.waterUnitName` | string | 📄 API Doc |
| `user.foodsLocale` | string | 📄 API Doc |
| `user.autoStrideEnabled` | boolean | 📄 API Doc |

---

## sleep
**Endpoint:** `GET /1.2/user/-/sleep/date/{date}.json`
**Status:** Empty (no sleep records for queried dates)
**Docs:** https://dev.fitbit.com/build/reference/web-api/sleep/

| Field | Type | Source |
|-------|------|--------|
| `summary.totalTimeInBed` | number | ✅ Payload |
| `summary.totalSleepRecords` | number | ✅ Payload |
| `summary.totalMinutesAsleep` | number | ✅ Payload |
| `summary.stages.deep` | number | 📄 API Doc |
| `summary.stages.light` | number | 📄 API Doc |
| `summary.stages.rem` | number | 📄 API Doc |
| `summary.stages.wake` | number | 📄 API Doc |
| `sleep[].dateOfSleep` | string | 📄 API Doc |
| `sleep[].duration` | number | 📄 API Doc — Total ms |
| `sleep[].efficiency` | number | 📄 API Doc — 0-100 |
| `sleep[].startTime` | string | 📄 API Doc |
| `sleep[].endTime` | string | 📄 API Doc |
| `sleep[].isMainSleep` | boolean | 📄 API Doc |
| `sleep[].logId` | number | 📄 API Doc |
| `sleep[].logType` | string | 📄 API Doc — auto_detected/manual |
| `sleep[].type` | string | 📄 API Doc — classic/stages |
| `sleep[].timeInBed` | number | 📄 API Doc |
| `sleep[].minutesAsleep` | number | 📄 API Doc |
| `sleep[].minutesAwake` | number | 📄 API Doc |
| `sleep[].levels.data[].dateTime` | string | 📄 API Doc — Stage transition time |
| `sleep[].levels.data[].level` | string | 📄 API Doc — deep/light/rem/wake |
| `sleep[].levels.data[].seconds` | number | 📄 API Doc |
| `sleep[].levels.shortData[]` | array | 📄 API Doc — Short wake episodes |
| `sleep[].levels.summary.deep.count` | number | 📄 API Doc |
| `sleep[].levels.summary.deep.minutes` | number | 📄 API Doc |
| `sleep[].levels.summary.deep.thirtyDayAvgMinutes` | number | 📄 API Doc |

---

## hrv
**Endpoint:** `GET /1/user/-/hrv/date/{date}.json`
**Status:** Empty
**Docs:** https://dev.fitbit.com/build/reference/web-api/heart-rate-variability/

| Field | Type | Source |
|-------|------|--------|
| `hrv[].dateTime` | string | 📄 API Doc |
| `hrv[].value.dailyRmssd` | number | 📄 API Doc — Daily RMSSD (ms) |
| `hrv[].value.deepRmssd` | number | 📄 API Doc — Deep sleep RMSSD (ms) |

---

## hrv_intraday
**Endpoint:** `GET /1/user/-/hrv/date/{date}/all.json`
**Status:** Empty
**Docs:** https://dev.fitbit.com/build/reference/web-api/heart-rate-variability/

| Field | Type | Source |
|-------|------|--------|
| `hrv[].minutes[].minute` | string | 📄 API Doc |
| `hrv[].minutes[].value.rmssd` | number | 📄 API Doc |
| `hrv[].minutes[].value.coverage` | number | 📄 API Doc |
| `hrv[].minutes[].value.hf` | number | 📄 API Doc — High frequency power |
| `hrv[].minutes[].value.lf` | number | 📄 API Doc — Low frequency power |

---

## spo2
**Endpoint:** `GET /1/user/-/spo2/date/{date}.json`
**Status:** Empty
**Docs:** https://dev.fitbit.com/build/reference/web-api/spo2/

| Field | Type | Source |
|-------|------|--------|
| `dateTime` | string | 📄 API Doc |
| `value.avg` | number | 📄 API Doc — Average SpO2 % |
| `value.min` | number | 📄 API Doc — Minimum SpO2 % |
| `value.max` | number | 📄 API Doc — Maximum SpO2 % |

---

## breathing_rate
**Endpoint:** `GET /1/user/-/br/date/{date}.json`
**Status:** Empty
**Docs:** https://dev.fitbit.com/build/reference/web-api/breathing-rate/

| Field | Type | Source |
|-------|------|--------|
| `br[].dateTime` | string | 📄 API Doc |
| `br[].value.breathingRate` | number | 📄 API Doc — Avg breaths/min (nighttime) |

---

## skin_temperature
**Endpoint:** `GET /1/user/-/temp/skin/date/{date}.json`
**Status:** Empty
**Docs:** https://dev.fitbit.com/build/reference/web-api/temperature/

| Field | Type | Source |
|-------|------|--------|
| `tempSkin[].dateTime` | string | 📄 API Doc |
| `tempSkin[].value.nightlyRelative` | number | 📄 API Doc — Variation from baseline |
| `tempSkin[].logType` | string | 📄 API Doc — dedicated_temp_sensor/other_sensors |

---

## core_temperature
**Endpoint:** `GET /1/user/-/temp/core/date/{date}.json`
**Status:** Empty
**Docs:** https://dev.fitbit.com/build/reference/web-api/temperature-core/

| Field | Type | Source |
|-------|------|--------|
| `tempCore[].dateTime` | string | 📄 API Doc |
| `tempCore[].value` | number | 📄 API Doc — Core temp (C/F) |

---

## body_weight / body_fat
**Endpoint:** `GET /1/user/-/body/log/weight/date/{date}.json` / `GET /1/user/-/body/log/fat/date/{date}.json`
**Status:** Empty
**Docs:** https://dev.fitbit.com/build/reference/web-api/body/

| Field | Type | Source |
|-------|------|--------|
| `weight[].bmi` | number | 📄 API Doc |
| `weight[].date` | string | 📄 API Doc |
| `weight[].fat` | number | 📄 API Doc |
| `weight[].logId` | number | 📄 API Doc |
| `weight[].source` | string | 📄 API Doc — API/Aria/AriaAir/Withings |
| `weight[].time` | string | 📄 API Doc |
| `weight[].weight` | number | 📄 API Doc |
| `fat[].date` | string | 📄 API Doc |
| `fat[].fat` | number | 📄 API Doc |

---

## vo2max
**Endpoint:** `GET /1/user/-/cardioscore/date/{date}.json`
**Status:** Empty
**Docs:** https://dev.fitbit.com/build/reference/web-api/cardio-fitness-score/

| Field | Type | Source |
|-------|------|--------|
| `cardioScore[].dateTime` | string | 📄 API Doc |
| `cardioScore[].value.vo2Max` | string | 📄 API Doc — VO2 Max (mL/kg/min) |

---

## azm (Active Zone Minutes)
**Endpoint:** `GET /1/user/-/activities/active-zone-minutes/date/{date}/1d.json`
**Status:** Empty
**Docs:** https://dev.fitbit.com/build/reference/web-api/active-zone-minutes-timeseries/

| Field | Type | Source |
|-------|------|--------|
| `activities-active-zone-minutes[].dateTime` | string | 📄 API Doc |
| `activities-active-zone-minutes[].value.activeZoneMinutes` | number | 📄 API Doc |
| `activities-active-zone-minutes[].value.fatBurnActiveZoneMinutes` | number | 📄 API Doc |
| `activities-active-zone-minutes[].value.cardioActiveZoneMinutes` | number | 📄 API Doc |
| `activities-active-zone-minutes[].value.peakActiveZoneMinutes` | number | 📄 API Doc |

---

## ecg
**Endpoint:** `GET /1/user/-/ecg/list.json`
**Status:** Empty
**Docs:** https://dev.fitbit.com/build/reference/web-api/electrocardiogram/

| Field | Type | Source |
|-------|------|--------|
| `ecgReadings[].startTime` | string | 📄 API Doc |
| `ecgReadings[].averageHeartRate` | number | 📄 API Doc |
| `ecgReadings[].resultClassification` | string | 📄 API Doc |
| `ecgReadings[].waveformSamples[]` | array | 📄 API Doc — Raw integer waveform |
| `ecgReadings[].samplingFrequencyHz` | number | 📄 API Doc |
| `ecgReadings[].scalingFactor` | number | 📄 API Doc |
| `ecgReadings[].deviceName` | string | 📄 API Doc |

---

## Not Collected Endpoints

These Fitbit API endpoints are NOT being fetched by the collector:

| Endpoint | API Path | Scope Required |
|----------|----------|----------------|
| **Nutrition / Food Log** | `GET /1/user/-/foods/log/date/{date}.json` | `nutrition` (not requested) |
| **Water Log** | `GET /1/user/-/foods/log/water/date/{date}.json` | `nutrition` (not requested) |
| **Activity Log List** | `GET /1/user/-/activities/list.json` | `activity` (already requested) |
| **Lifetime Stats** | `GET /1/user/-/activities.json` | `activity` (already requested) |
| **IRN (AFib)** | `GET /1/user/-/irn/alerts/list.json` | `heartrate` (already requested) |
