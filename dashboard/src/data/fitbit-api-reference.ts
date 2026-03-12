/**
 * Fitbit Web API field reference.
 * Each category lists fields with their source:
 *   - "payload": field was found in actual collected payload data
 *   - "api_doc": field is documented in official Fitbit API docs but not seen in payload
 */

export interface FieldRef {
  path: string
  type: string
  source: 'payload' | 'api_doc'
  description?: string
}

export interface CategoryRef {
  endpoint: string
  docsUrl: string
  status: 'has_data' | 'empty' | 'not_collected' | 'newly_added'
  fields: FieldRef[]
  note?: string
  /** Why this endpoint was not included in the initial collector */
  notCollectedReason?: string
}

export const FITBIT_API_REFERENCE: Record<string, CategoryRef> = {
  heart_rate: {
    endpoint: 'GET /1/user/-/activities/heart/date/{date}/1d/1sec.json',
    docsUrl: 'https://dev.fitbit.com/build/reference/web-api/heartrate-timeseries/',
    status: 'has_data',
    fields: [
      { path: 'activities-heart[].dateTime', type: 'string', source: 'payload' },
      { path: 'activities-heart[].value.heartRateZones[].max', type: 'number', source: 'payload' },
      { path: 'activities-heart[].value.heartRateZones[].min', type: 'number', source: 'payload' },
      { path: 'activities-heart[].value.heartRateZones[].name', type: 'string', source: 'payload', description: 'Out of Range / Fat Burn / Cardio / Peak' },
      { path: 'activities-heart[].value.heartRateZones[].minutes', type: 'number', source: 'payload' },
      { path: 'activities-heart[].value.heartRateZones[].caloriesOut', type: 'number', source: 'payload' },
      { path: 'activities-heart[].value.customHeartRateZones[]', type: 'array', source: 'payload' },
      { path: 'activities-heart[].value.restingHeartRate', type: 'number', source: 'api_doc', description: 'Resting heart rate for the day' },
    ],
  },

  heart_rate_zones: {
    endpoint: 'GET /1/user/-/activities/heart/date/{date}/1d.json',
    docsUrl: 'https://dev.fitbit.com/build/reference/web-api/heartrate-timeseries/',
    status: 'has_data',
    fields: [
      { path: 'activities-heart[].dateTime', type: 'string', source: 'payload' },
      { path: 'activities-heart[].value.heartRateZones[].max', type: 'number', source: 'payload' },
      { path: 'activities-heart[].value.heartRateZones[].min', type: 'number', source: 'payload' },
      { path: 'activities-heart[].value.heartRateZones[].name', type: 'string', source: 'payload' },
      { path: 'activities-heart[].value.heartRateZones[].minutes', type: 'number', source: 'payload' },
      { path: 'activities-heart[].value.heartRateZones[].caloriesOut', type: 'number', source: 'payload' },
      { path: 'activities-heart[].value.customHeartRateZones[]', type: 'array', source: 'payload' },
      { path: 'activities-heart[].value.restingHeartRate', type: 'number', source: 'api_doc', description: 'Resting heart rate for the day' },
    ],
  },

  activity_summary: {
    endpoint: 'GET /1/user/-/activities/date/{date}.json',
    docsUrl: 'https://dev.fitbit.com/build/reference/web-api/activity/',
    status: 'has_data',
    fields: [
      { path: 'goals.steps', type: 'number', source: 'payload' },
      { path: 'goals.floors', type: 'number', source: 'payload' },
      { path: 'goals.distance', type: 'number', source: 'payload' },
      { path: 'goals.caloriesOut', type: 'number', source: 'payload' },
      { path: 'goals.activeMinutes', type: 'number', source: 'payload' },
      { path: 'summary.steps', type: 'number', source: 'payload' },
      { path: 'summary.distances[].activity', type: 'string', source: 'payload' },
      { path: 'summary.distances[].distance', type: 'number', source: 'payload' },
      { path: 'summary.activeScore', type: 'number', source: 'payload' },
      { path: 'summary.caloriesBMR', type: 'number', source: 'payload' },
      { path: 'summary.caloriesOut', type: 'number', source: 'payload' },
      { path: 'summary.heartRateZones[]', type: 'array', source: 'payload' },
      { path: 'summary.activityCalories', type: 'number', source: 'payload' },
      { path: 'summary.marginalCalories', type: 'number', source: 'payload' },
      { path: 'summary.sedentaryMinutes', type: 'number', source: 'payload' },
      { path: 'summary.veryActiveMinutes', type: 'number', source: 'payload' },
      { path: 'summary.fairlyActiveMinutes', type: 'number', source: 'payload' },
      { path: 'summary.lightlyActiveMinutes', type: 'number', source: 'payload' },
      { path: 'activities[]', type: 'array', source: 'payload' },
      { path: 'summary.elevation', type: 'number', source: 'api_doc', description: 'Elevation gained in meters' },
      { path: 'summary.floors', type: 'number', source: 'api_doc', description: 'Floors climbed' },
      { path: 'summary.restingHeartRate', type: 'number', source: 'api_doc', description: 'Resting heart rate' },
      { path: 'summary.useEstimation', type: 'boolean', source: 'api_doc', description: 'Whether calorie estimation was used' },
      { path: 'summary.caloriesOutUnestimated', type: 'number', source: 'api_doc', description: 'Unestimated calories out' },
      { path: 'summary.calorieEstimationMu', type: 'number', source: 'api_doc', description: 'Calorie estimation MU' },
    ],
  },

  steps_intraday: {
    endpoint: 'GET /1/user/-/activities/steps/date/{date}/1d/1min.json',
    docsUrl: 'https://dev.fitbit.com/build/reference/web-api/intraday/',
    status: 'has_data',
    fields: [
      { path: 'activities-steps[].value', type: 'string', source: 'payload' },
      { path: 'activities-steps[].dateTime', type: 'string', source: 'payload' },
      { path: 'activities-steps-intraday.dataset[].time', type: 'string', source: 'api_doc', description: 'HH:mm:ss timestamp for each minute' },
      { path: 'activities-steps-intraday.dataset[].value', type: 'number', source: 'api_doc', description: 'Steps in that minute interval' },
      { path: 'activities-steps-intraday.datasetInterval', type: 'number', source: 'api_doc', description: 'Interval in minutes (1, 5, or 15)' },
      { path: 'activities-steps-intraday.datasetType', type: 'string', source: 'api_doc', description: 'Type of dataset' },
    ],
  },

  calories_intraday: {
    endpoint: 'GET /1/user/-/activities/calories/date/{date}/1d/15min.json',
    docsUrl: 'https://dev.fitbit.com/build/reference/web-api/intraday/',
    status: 'has_data',
    fields: [
      { path: 'activities-calories[].value', type: 'string', source: 'payload' },
      { path: 'activities-calories[].dateTime', type: 'string', source: 'payload' },
      { path: 'activities-calories-intraday.dataset[].time', type: 'string', source: 'api_doc', description: 'HH:mm:ss timestamp' },
      { path: 'activities-calories-intraday.dataset[].value', type: 'number', source: 'api_doc', description: 'Calories burned in interval' },
      { path: 'activities-calories-intraday.dataset[].level', type: 'number', source: 'api_doc', description: 'Activity level (0-3)' },
      { path: 'activities-calories-intraday.dataset[].mets', type: 'number', source: 'api_doc', description: 'Metabolic equivalent of task' },
    ],
  },

  distance_intraday: {
    endpoint: 'GET /1/user/-/activities/distance/date/{date}/1d/1min.json',
    docsUrl: 'https://dev.fitbit.com/build/reference/web-api/intraday/',
    status: 'has_data',
    fields: [
      { path: 'activities-distance[].value', type: 'string', source: 'payload' },
      { path: 'activities-distance[].dateTime', type: 'string', source: 'payload' },
      { path: 'activities-distance-intraday.dataset[].time', type: 'string', source: 'api_doc', description: 'HH:mm:ss timestamp' },
      { path: 'activities-distance-intraday.dataset[].value', type: 'number', source: 'api_doc', description: 'Distance in interval' },
    ],
  },

  profile: {
    endpoint: 'GET /1/user/-/profile.json',
    docsUrl: 'https://dev.fitbit.com/build/reference/web-api/user/',
    status: 'has_data',
    fields: [
      { path: 'user.age', type: 'number', source: 'payload' },
      { path: 'user.gender', type: 'string', source: 'payload' },
      { path: 'user.height', type: 'number', source: 'payload' },
      { path: 'user.weight', type: 'number', source: 'payload' },
      { path: 'user.fullName', type: 'string', source: 'payload' },
      { path: 'user.firstName', type: 'string', source: 'payload' },
      { path: 'user.lastName', type: 'string', source: 'payload' },
      { path: 'user.displayName', type: 'string', source: 'payload' },
      { path: 'user.encodedId', type: 'string', source: 'payload' },
      { path: 'user.dateOfBirth', type: 'string', source: 'payload' },
      { path: 'user.memberSince', type: 'string', source: 'payload' },
      { path: 'user.timezone', type: 'string', source: 'payload' },
      { path: 'user.locale', type: 'string', source: 'payload' },
      { path: 'user.languageLocale', type: 'string', source: 'payload' },
      { path: 'user.heightUnit', type: 'string', source: 'payload' },
      { path: 'user.weightUnit', type: 'string', source: 'payload' },
      { path: 'user.distanceUnit', type: 'string', source: 'payload' },
      { path: 'user.glucoseUnit', type: 'string', source: 'payload' },
      { path: 'user.swimUnit', type: 'string', source: 'payload' },
      { path: 'user.avatar', type: 'string', source: 'payload' },
      { path: 'user.avatar150', type: 'string', source: 'payload' },
      { path: 'user.avatar640', type: 'string', source: 'payload' },
      { path: 'user.sleepTracking', type: 'string', source: 'payload' },
      { path: 'user.mfaEnabled', type: 'boolean', source: 'payload' },
      { path: 'user.isChild', type: 'boolean', source: 'payload' },
      { path: 'user.isCoach', type: 'boolean', source: 'payload' },
      { path: 'user.ambassador', type: 'boolean', source: 'payload' },
      { path: 'user.corporate', type: 'boolean', source: 'payload' },
      { path: 'user.clockTimeDisplayFormat', type: 'string', source: 'payload' },
      { path: 'user.startDayOfWeek', type: 'string', source: 'payload' },
      { path: 'user.strideLengthRunning', type: 'number', source: 'payload' },
      { path: 'user.strideLengthWalking', type: 'number', source: 'payload' },
      { path: 'user.averageDailySteps', type: 'number', source: 'payload' },
      { path: 'user.offsetFromUTCMillis', type: 'number', source: 'payload' },
      { path: 'user.features.exerciseGoal', type: 'boolean', source: 'payload' },
      { path: 'user.topBadges[]', type: 'array', source: 'payload' },
      { path: 'user.aboutMe', type: 'string', source: 'api_doc', description: 'User bio text' },
      { path: 'user.country', type: 'string', source: 'api_doc', description: 'User country' },
      { path: 'user.state', type: 'string', source: 'api_doc', description: 'User state/region' },
      { path: 'user.temperatureUnit', type: 'string', source: 'api_doc', description: 'Celsius or Fahrenheit' },
      { path: 'user.waterUnit', type: 'string', source: 'api_doc', description: 'Water measurement unit' },
      { path: 'user.waterUnitName', type: 'string', source: 'api_doc', description: 'Water unit display name' },
      { path: 'user.foodsLocale', type: 'string', source: 'api_doc', description: 'Food database locale' },
      { path: 'user.autoStrideEnabled', type: 'boolean', source: 'api_doc', description: 'Auto stride length calculation' },
    ],
  },

  sleep: {
    endpoint: 'GET /1.2/user/-/sleep/date/{date}.json',
    docsUrl: 'https://dev.fitbit.com/build/reference/web-api/sleep/',
    status: 'empty',
    note: 'Structure exists but sleep[] array was empty for queried dates',
    fields: [
      { path: 'summary.totalTimeInBed', type: 'number', source: 'payload' },
      { path: 'summary.totalSleepRecords', type: 'number', source: 'payload' },
      { path: 'summary.totalMinutesAsleep', type: 'number', source: 'payload' },
      { path: 'summary.stages.deep', type: 'number', source: 'api_doc', description: 'Minutes in deep sleep' },
      { path: 'summary.stages.light', type: 'number', source: 'api_doc', description: 'Minutes in light sleep' },
      { path: 'summary.stages.rem', type: 'number', source: 'api_doc', description: 'Minutes in REM sleep' },
      { path: 'summary.stages.wake', type: 'number', source: 'api_doc', description: 'Minutes awake' },
      { path: 'sleep[].dateOfSleep', type: 'string', source: 'api_doc', description: 'Date of the sleep log (YYYY-MM-DD)' },
      { path: 'sleep[].duration', type: 'number', source: 'api_doc', description: 'Total duration in milliseconds' },
      { path: 'sleep[].efficiency', type: 'number', source: 'api_doc', description: 'Sleep efficiency score (0-100)' },
      { path: 'sleep[].startTime', type: 'string', source: 'api_doc', description: 'Sleep start time (ISO 8601)' },
      { path: 'sleep[].endTime', type: 'string', source: 'api_doc', description: 'Sleep end time (ISO 8601)' },
      { path: 'sleep[].isMainSleep', type: 'boolean', source: 'api_doc', description: 'Whether this is the main sleep period' },
      { path: 'sleep[].logId', type: 'number', source: 'api_doc', description: 'Unique sleep log ID' },
      { path: 'sleep[].logType', type: 'string', source: 'api_doc', description: 'auto_detected or manual' },
      { path: 'sleep[].type', type: 'string', source: 'api_doc', description: 'classic or stages' },
      { path: 'sleep[].timeInBed', type: 'number', source: 'api_doc', description: 'Total minutes in bed' },
      { path: 'sleep[].minutesAsleep', type: 'number', source: 'api_doc', description: 'Total minutes asleep' },
      { path: 'sleep[].minutesAwake', type: 'number', source: 'api_doc', description: 'Total minutes awake' },
      { path: 'sleep[].minutesAfterWakeup', type: 'number', source: 'api_doc', description: 'Minutes in bed after waking' },
      { path: 'sleep[].minutesToFallAsleep', type: 'number', source: 'api_doc', description: 'Minutes to fall asleep' },
      { path: 'sleep[].infoCode', type: 'number', source: 'api_doc', description: 'Sleep info code' },
      { path: 'sleep[].levels.data[].dateTime', type: 'string', source: 'api_doc', description: 'Stage transition time' },
      { path: 'sleep[].levels.data[].level', type: 'string', source: 'api_doc', description: 'deep / light / rem / wake' },
      { path: 'sleep[].levels.data[].seconds', type: 'number', source: 'api_doc', description: 'Duration in seconds' },
      { path: 'sleep[].levels.shortData[]', type: 'array', source: 'api_doc', description: 'Short wake episodes (<=3 min)' },
      { path: 'sleep[].levels.summary.deep.count', type: 'number', source: 'api_doc', description: 'Number of deep sleep periods' },
      { path: 'sleep[].levels.summary.deep.minutes', type: 'number', source: 'api_doc', description: 'Total deep sleep minutes' },
      { path: 'sleep[].levels.summary.deep.thirtyDayAvgMinutes', type: 'number', source: 'api_doc', description: '30-day average deep minutes' },
      { path: 'sleep[].levels.summary.light', type: 'object', source: 'api_doc', description: 'Same structure as deep' },
      { path: 'sleep[].levels.summary.rem', type: 'object', source: 'api_doc', description: 'Same structure as deep' },
      { path: 'sleep[].levels.summary.wake', type: 'object', source: 'api_doc', description: 'Same structure as deep' },
    ],
  },

  hrv: {
    endpoint: 'GET /1/user/-/hrv/date/{date}.json',
    docsUrl: 'https://dev.fitbit.com/build/reference/web-api/heart-rate-variability/',
    status: 'empty',
    fields: [
      { path: 'hrv[].dateTime', type: 'string', source: 'api_doc', description: 'Date of measurement' },
      { path: 'hrv[].value.dailyRmssd', type: 'number', source: 'api_doc', description: 'Daily RMSSD in milliseconds' },
      { path: 'hrv[].value.deepRmssd', type: 'number', source: 'api_doc', description: 'Deep sleep RMSSD in milliseconds' },
    ],
  },

  hrv_intraday: {
    endpoint: 'GET /1/user/-/hrv/date/{date}/all.json',
    docsUrl: 'https://dev.fitbit.com/build/reference/web-api/heart-rate-variability/',
    status: 'empty',
    fields: [
      { path: 'hrv[].dateTime', type: 'string', source: 'api_doc', description: 'Date of measurement' },
      { path: 'hrv[].minutes[].minute', type: 'string', source: 'api_doc', description: 'Timestamp of HRV reading' },
      { path: 'hrv[].minutes[].value.rmssd', type: 'number', source: 'api_doc', description: 'RMSSD value' },
      { path: 'hrv[].minutes[].value.coverage', type: 'number', source: 'api_doc', description: 'Data coverage quality' },
      { path: 'hrv[].minutes[].value.hf', type: 'number', source: 'api_doc', description: 'High frequency power' },
      { path: 'hrv[].minutes[].value.lf', type: 'number', source: 'api_doc', description: 'Low frequency power' },
    ],
  },

  spo2: {
    endpoint: 'GET /1/user/-/spo2/date/{date}.json',
    docsUrl: 'https://dev.fitbit.com/build/reference/web-api/spo2/',
    status: 'empty',
    fields: [
      { path: 'dateTime', type: 'string', source: 'api_doc', description: 'Date of measurement' },
      { path: 'value.avg', type: 'number', source: 'api_doc', description: 'Average SpO2 percentage' },
      { path: 'value.min', type: 'number', source: 'api_doc', description: 'Minimum SpO2 percentage' },
      { path: 'value.max', type: 'number', source: 'api_doc', description: 'Maximum SpO2 percentage' },
    ],
  },

  spo2_intraday: {
    endpoint: 'GET /1/user/-/spo2/date/{date}/all.json',
    docsUrl: 'https://dev.fitbit.com/build/reference/web-api/spo2/',
    status: 'empty',
    fields: [
      { path: 'minutes[].value', type: 'number', source: 'api_doc', description: 'SpO2 percentage reading' },
      { path: 'minutes[].minute', type: 'string', source: 'api_doc', description: 'Timestamp of reading' },
    ],
  },

  breathing_rate: {
    endpoint: 'GET /1/user/-/br/date/{date}.json',
    docsUrl: 'https://dev.fitbit.com/build/reference/web-api/breathing-rate/',
    status: 'empty',
    fields: [
      { path: 'br[].dateTime', type: 'string', source: 'api_doc', description: 'Date of measurement' },
      { path: 'br[].value.breathingRate', type: 'number', source: 'api_doc', description: 'Average breaths per minute (nighttime)' },
    ],
  },

  skin_temperature: {
    endpoint: 'GET /1/user/-/temp/skin/date/{date}.json',
    docsUrl: 'https://dev.fitbit.com/build/reference/web-api/temperature/',
    status: 'empty',
    fields: [
      { path: 'tempSkin[].dateTime', type: 'string', source: 'api_doc', description: 'Date of measurement' },
      { path: 'tempSkin[].value.nightlyRelative', type: 'number', source: 'api_doc', description: 'Nightly skin temp variation from baseline (C/F)' },
      { path: 'tempSkin[].logType', type: 'string', source: 'api_doc', description: 'dedicated_temp_sensor or other_sensors' },
    ],
  },

  core_temperature: {
    endpoint: 'GET /1/user/-/temp/core/date/{date}.json',
    docsUrl: 'https://dev.fitbit.com/build/reference/web-api/temperature-core/',
    status: 'empty',
    fields: [
      { path: 'tempCore[].dateTime', type: 'string', source: 'api_doc', description: 'Timestamp (ISO 8601)' },
      { path: 'tempCore[].value', type: 'number', source: 'api_doc', description: 'Core temperature (C/F)' },
    ],
  },

  body_weight: {
    endpoint: 'GET /1/user/-/body/log/weight/date/{date}.json',
    docsUrl: 'https://dev.fitbit.com/build/reference/web-api/body/',
    status: 'empty',
    fields: [
      { path: 'weight[].bmi', type: 'number', source: 'api_doc', description: 'Body Mass Index' },
      { path: 'weight[].date', type: 'string', source: 'api_doc', description: 'Log date (YYYY-MM-DD)' },
      { path: 'weight[].fat', type: 'number', source: 'api_doc', description: 'Body fat percentage' },
      { path: 'weight[].logId', type: 'number', source: 'api_doc', description: 'Unique log ID' },
      { path: 'weight[].source', type: 'string', source: 'api_doc', description: 'API / Aria / AriaAir / Withings' },
      { path: 'weight[].time', type: 'string', source: 'api_doc', description: 'Log time (HH:mm:ss)' },
      { path: 'weight[].weight', type: 'number', source: 'api_doc', description: 'Weight value' },
    ],
  },

  body_fat: {
    endpoint: 'GET /1/user/-/body/log/fat/date/{date}.json',
    docsUrl: 'https://dev.fitbit.com/build/reference/web-api/body/',
    status: 'empty',
    fields: [
      { path: 'fat[].date', type: 'string', source: 'api_doc', description: 'Log date (YYYY-MM-DD)' },
      { path: 'fat[].fat', type: 'number', source: 'api_doc', description: 'Body fat percentage' },
      { path: 'fat[].logId', type: 'number', source: 'api_doc', description: 'Unique log ID' },
      { path: 'fat[].source', type: 'string', source: 'api_doc', description: 'Data source' },
      { path: 'fat[].time', type: 'string', source: 'api_doc', description: 'Log time (HH:mm:ss)' },
    ],
  },

  vo2max: {
    endpoint: 'GET /1/user/-/cardioscore/date/{date}.json',
    docsUrl: 'https://dev.fitbit.com/build/reference/web-api/cardio-fitness-score/',
    status: 'empty',
    fields: [
      { path: 'cardioScore[].dateTime', type: 'string', source: 'api_doc', description: 'Date of measurement' },
      { path: 'cardioScore[].value.vo2Max', type: 'string', source: 'api_doc', description: 'VO2 Max in mL/kg/min (range string like "44-48")' },
    ],
  },

  azm: {
    endpoint: 'GET /1/user/-/activities/active-zone-minutes/date/{date}/1d.json',
    docsUrl: 'https://dev.fitbit.com/build/reference/web-api/active-zone-minutes-timeseries/',
    status: 'empty',
    fields: [
      { path: 'activities-active-zone-minutes[].dateTime', type: 'string', source: 'api_doc', description: 'Date' },
      { path: 'activities-active-zone-minutes[].value.activeZoneMinutes', type: 'number', source: 'api_doc', description: 'Total active zone minutes' },
      { path: 'activities-active-zone-minutes[].value.fatBurnActiveZoneMinutes', type: 'number', source: 'api_doc', description: 'Fat burn zone minutes' },
      { path: 'activities-active-zone-minutes[].value.cardioActiveZoneMinutes', type: 'number', source: 'api_doc', description: 'Cardio zone minutes' },
      { path: 'activities-active-zone-minutes[].value.peakActiveZoneMinutes', type: 'number', source: 'api_doc', description: 'Peak zone minutes' },
    ],
  },

  ecg: {
    endpoint: 'GET /1/user/-/ecg/list.json',
    docsUrl: 'https://dev.fitbit.com/build/reference/web-api/electrocardiogram/',
    status: 'empty',
    fields: [
      { path: 'ecgReadings[].startTime', type: 'string', source: 'api_doc', description: 'ECG recording start time' },
      { path: 'ecgReadings[].averageHeartRate', type: 'number', source: 'api_doc', description: 'Average HR during recording' },
      { path: 'ecgReadings[].resultClassification', type: 'string', source: 'api_doc', description: 'AFib detection result' },
      { path: 'ecgReadings[].waveformSamples[]', type: 'array', source: 'api_doc', description: 'Raw waveform data (integer array)' },
      { path: 'ecgReadings[].samplingFrequencyHz', type: 'number', source: 'api_doc', description: 'Sampling frequency' },
      { path: 'ecgReadings[].scalingFactor', type: 'number', source: 'api_doc', description: 'Waveform scaling factor' },
      { path: 'ecgReadings[].numberOfWaveformSamples', type: 'number', source: 'api_doc', description: 'Number of samples' },
      { path: 'ecgReadings[].leadNumber', type: 'number', source: 'api_doc', description: 'ECG lead number' },
      { path: 'ecgReadings[].featureVersion', type: 'string', source: 'api_doc', description: 'Feature version' },
      { path: 'ecgReadings[].deviceName', type: 'string', source: 'api_doc', description: 'Device model name' },
      { path: 'ecgReadings[].firmwareVersion', type: 'string', source: 'api_doc', description: 'Device firmware version' },
    ],
  },

  devices: {
    endpoint: 'GET /1/user/-/devices.json',
    docsUrl: 'https://dev.fitbit.com/build/reference/web-api/devices/',
    status: 'empty',
    fields: [
      { path: '[].battery', type: 'string', source: 'api_doc', description: 'High / Medium / Low / Empty' },
      { path: '[].batteryLevel', type: 'number', source: 'api_doc', description: 'Battery level 0-100' },
      { path: '[].deviceVersion', type: 'string', source: 'api_doc', description: 'Device model name' },
      { path: '[].features[]', type: 'array', source: 'api_doc', description: 'Supported features' },
      { path: '[].id', type: 'string', source: 'api_doc', description: 'Device ID' },
      { path: '[].lastSyncTime', type: 'string', source: 'api_doc', description: 'Last sync timestamp' },
      { path: '[].mac', type: 'string', source: 'api_doc', description: 'MAC address' },
      { path: '[].type', type: 'string', source: 'api_doc', description: 'TRACKER or SCALE' },
    ],
  },

  // ─── Newly added endpoints (were previously not collected) ───

  food_log: {
    endpoint: 'GET /1/user/-/foods/log/date/{date}.json',
    docsUrl: 'https://dev.fitbit.com/build/reference/web-api/nutrition/',
    status: 'newly_added',
    notCollectedReason: 'Required "nutrition" OAuth scope which was not originally requested. Added nutrition scope and endpoint.',
    fields: [
      { path: 'foods[].loggedFood.name', type: 'string', source: 'api_doc', description: 'Food item name' },
      { path: 'foods[].loggedFood.calories', type: 'number', source: 'api_doc', description: 'Calories per serving' },
      { path: 'foods[].loggedFood.brand', type: 'string', source: 'api_doc', description: 'Food brand' },
      { path: 'foods[].loggedFood.amount', type: 'number', source: 'api_doc', description: 'Amount consumed' },
      { path: 'foods[].loggedFood.mealTypeId', type: 'number', source: 'api_doc', description: 'Meal type (1=Breakfast, 2=Lunch, etc.)' },
      { path: 'foods[].loggedFood.unit.name', type: 'string', source: 'api_doc', description: 'Unit of measurement' },
      { path: 'foods[].nutritionalValues.calories', type: 'number', source: 'api_doc', description: 'Total calories' },
      { path: 'foods[].nutritionalValues.carbs', type: 'number', source: 'api_doc', description: 'Carbohydrates (g)' },
      { path: 'foods[].nutritionalValues.fat', type: 'number', source: 'api_doc', description: 'Fat (g)' },
      { path: 'foods[].nutritionalValues.fiber', type: 'number', source: 'api_doc', description: 'Fiber (g)' },
      { path: 'foods[].nutritionalValues.protein', type: 'number', source: 'api_doc', description: 'Protein (g)' },
      { path: 'foods[].nutritionalValues.sodium', type: 'number', source: 'api_doc', description: 'Sodium (mg)' },
      { path: 'goals.calories', type: 'number', source: 'api_doc', description: 'Daily calorie goal' },
      { path: 'summary.calories', type: 'number', source: 'api_doc', description: 'Total calories consumed' },
      { path: 'summary.carbs', type: 'number', source: 'api_doc', description: 'Total carbs (g)' },
      { path: 'summary.fat', type: 'number', source: 'api_doc', description: 'Total fat (g)' },
      { path: 'summary.protein', type: 'number', source: 'api_doc', description: 'Total protein (g)' },
      { path: 'summary.water', type: 'number', source: 'api_doc', description: 'Total water (ml)' },
    ],
  },

  water_log: {
    endpoint: 'GET /1/user/-/foods/log/water/date/{date}.json',
    docsUrl: 'https://dev.fitbit.com/build/reference/web-api/nutrition/',
    status: 'newly_added',
    notCollectedReason: 'Required "nutrition" OAuth scope which was not originally requested. Added nutrition scope and endpoint.',
    fields: [
      { path: 'summary.water', type: 'number', source: 'api_doc', description: 'Total water intake (ml)' },
      { path: 'water[].amount', type: 'number', source: 'api_doc', description: 'Water amount per log entry (ml)' },
      { path: 'water[].logId', type: 'number', source: 'api_doc', description: 'Unique water log ID' },
    ],
  },

  activity_log: {
    endpoint: 'GET /1/user/-/activities/list.json',
    docsUrl: 'https://dev.fitbit.com/build/reference/web-api/activity/',
    status: 'newly_added',
    notCollectedReason: 'Endpoint was overlooked in initial implementation. Unlike activity_summary (daily totals), this returns individual exercise sessions. Scope "activity" was already requested.',
    fields: [
      { path: 'activities[].activityName', type: 'string', source: 'api_doc', description: 'Exercise name (e.g. "Run", "Bike")' },
      { path: 'activities[].startTime', type: 'string', source: 'api_doc', description: 'Exercise start time (ISO 8601)' },
      { path: 'activities[].activeDuration', type: 'number', source: 'api_doc', description: 'Active duration in milliseconds' },
      { path: 'activities[].duration', type: 'number', source: 'api_doc', description: 'Total duration in milliseconds' },
      { path: 'activities[].calories', type: 'number', source: 'api_doc', description: 'Calories burned' },
      { path: 'activities[].distance', type: 'number', source: 'api_doc', description: 'Distance covered' },
      { path: 'activities[].distanceUnit', type: 'string', source: 'api_doc', description: 'Distance unit' },
      { path: 'activities[].steps', type: 'number', source: 'api_doc', description: 'Steps during exercise' },
      { path: 'activities[].averageHeartRate', type: 'number', source: 'api_doc', description: 'Average heart rate during exercise' },
      { path: 'activities[].pace', type: 'number', source: 'api_doc', description: 'Pace (ms/km)' },
      { path: 'activities[].speed', type: 'number', source: 'api_doc', description: 'Speed' },
      { path: 'activities[].elevationGain', type: 'number', source: 'api_doc', description: 'Elevation gain in meters' },
      { path: 'activities[].hasActiveZoneMinutes', type: 'boolean', source: 'api_doc', description: 'Whether AZM data exists' },
      { path: 'activities[].logId', type: 'number', source: 'api_doc', description: 'Unique activity log ID' },
      { path: 'activities[].logType', type: 'string', source: 'api_doc', description: 'auto_detected or manual' },
      { path: 'activities[].tcxLink', type: 'string', source: 'api_doc', description: 'Link to download TCX/GPS data' },
      { path: 'activities[].activityLevel[]', type: 'array', source: 'api_doc', description: 'Activity level breakdown' },
    ],
  },

  lifetime_stats: {
    endpoint: 'GET /1/user/-/activities.json',
    docsUrl: 'https://dev.fitbit.com/build/reference/web-api/activity/',
    status: 'newly_added',
    notCollectedReason: 'Endpoint was overlooked in initial implementation. Returns all-time totals rather than daily data. Scope "activity" was already requested.',
    fields: [
      { path: 'best.total.distance.date', type: 'string', source: 'api_doc', description: 'Date of best distance' },
      { path: 'best.total.distance.value', type: 'number', source: 'api_doc', description: 'Best distance value' },
      { path: 'best.total.floors.date', type: 'string', source: 'api_doc', description: 'Date of most floors' },
      { path: 'best.total.floors.value', type: 'number', source: 'api_doc', description: 'Most floors in a day' },
      { path: 'best.total.steps.date', type: 'string', source: 'api_doc', description: 'Date of most steps' },
      { path: 'best.total.steps.value', type: 'number', source: 'api_doc', description: 'Most steps in a day' },
      { path: 'lifetime.total.distance', type: 'number', source: 'api_doc', description: 'Total lifetime distance' },
      { path: 'lifetime.total.floors', type: 'number', source: 'api_doc', description: 'Total lifetime floors' },
      { path: 'lifetime.total.steps', type: 'number', source: 'api_doc', description: 'Total lifetime steps' },
      { path: 'lifetime.total.caloriesOut', type: 'number', source: 'api_doc', description: 'Total lifetime calories burned' },
    ],
  },

  irn_alerts: {
    endpoint: 'GET /1/user/-/irn/alerts/list.json',
    docsUrl: 'https://dev.fitbit.com/build/reference/web-api/irregular-rhythm-notifications/',
    status: 'newly_added',
    notCollectedReason: 'Endpoint was overlooked in initial implementation. IRN is a relatively new Fitbit feature for AFib detection. Scope "heartrate" was already requested.',
    fields: [
      { path: 'irnAlerts[].alertTime', type: 'string', source: 'api_doc', description: 'Timestamp of IRN alert' },
      { path: 'irnAlerts[].resultClassification', type: 'string', source: 'api_doc', description: 'Detection result' },
    ],
  },

  breathing_rate_intraday: {
    endpoint: 'GET /1/user/-/br/date/{date}/all.json',
    docsUrl: 'https://dev.fitbit.com/build/reference/web-api/breathing-rate/',
    status: 'newly_added',
    notCollectedReason: 'Only the daily summary was collected, not the per-sleep-stage intraday breakdown. Scope "respiratory_rate" was already requested.',
    fields: [
      { path: 'br[].dateTime', type: 'string', source: 'api_doc', description: 'Date of measurement' },
      { path: 'br[].value.deepSleepSummary.breathingRate', type: 'number', source: 'api_doc', description: 'Breathing rate during deep sleep' },
      { path: 'br[].value.remSleepSummary.breathingRate', type: 'number', source: 'api_doc', description: 'Breathing rate during REM sleep' },
      { path: 'br[].value.lightSleepSummary.breathingRate', type: 'number', source: 'api_doc', description: 'Breathing rate during light sleep' },
      { path: 'br[].value.fullSleepSummary.breathingRate', type: 'number', source: 'api_doc', description: 'Average breathing rate for full sleep' },
    ],
  },
}

/** No more uncollected endpoints - all have been added to the collector */
export const FITBIT_NOT_COLLECTED: {
  name: string
  endpoint: string
  docsUrl: string
  description: string
  requiredScope: string
}[] = []
