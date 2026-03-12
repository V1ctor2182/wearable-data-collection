/**
 * Oura Ring API V2 field reference.
 * Each category lists fields with their source:
 *   - "payload": field was found in actual collected payload data
 *   - "api_doc": field is documented in official Oura API docs but not seen in payload
 *
 * Re-uses shared interfaces from fitbit-api-reference.ts
 */

import type { FieldRef, CategoryRef } from './fitbit-api-reference'

export const OURA_API_REFERENCE: Record<string, CategoryRef> = {
  personal_info: {
    endpoint: 'GET /v2/usercollection/personal_info',
    docsUrl: 'https://cloud.ouraring.com/v2/docs#tag/Personal-Info',
    status: 'has_data',
    fields: [
      { path: 'id', type: 'string', source: 'payload', description: 'User ID' },
      { path: 'age', type: 'number', source: 'payload', description: 'User age' },
      { path: 'weight', type: 'number', source: 'payload', description: 'Weight (kg)' },
      { path: 'height', type: 'number', source: 'payload', description: 'Height (m)' },
      { path: 'biological_sex', type: 'string', source: 'payload', description: 'male / female' },
      { path: 'email', type: 'string', source: 'payload', description: 'User email' },
    ],
  },

  daily_activity: {
    endpoint: 'GET /v2/usercollection/daily_activity',
    docsUrl: 'https://cloud.ouraring.com/v2/docs#tag/Daily-Activity',
    status: 'empty',
    fields: [
      { path: 'data[].id', type: 'string', source: 'api_doc', description: 'Document ID' },
      { path: 'data[].day', type: 'string', source: 'api_doc', description: 'Date (YYYY-MM-DD)' },
      { path: 'data[].score', type: 'number', source: 'api_doc', description: 'Activity score (0-100)' },
      { path: 'data[].active_calories', type: 'number', source: 'api_doc', description: 'Active calories burned' },
      { path: 'data[].total_calories', type: 'number', source: 'api_doc', description: 'Total calories burned' },
      { path: 'data[].steps', type: 'number', source: 'api_doc', description: 'Total steps' },
      { path: 'data[].equivalent_walking_distance', type: 'number', source: 'api_doc', description: 'Equivalent walking distance (m)' },
      { path: 'data[].high_activity_met_minutes', type: 'number', source: 'api_doc', description: 'High activity MET minutes' },
      { path: 'data[].medium_activity_met_minutes', type: 'number', source: 'api_doc', description: 'Medium activity MET minutes' },
      { path: 'data[].low_activity_met_minutes', type: 'number', source: 'api_doc', description: 'Low activity MET minutes' },
      { path: 'data[].sedentary_met_minutes', type: 'number', source: 'api_doc', description: 'Sedentary MET minutes' },
      { path: 'data[].non_wear_minutes', type: 'number', source: 'api_doc', description: 'Non-wear time (minutes)' },
      { path: 'data[].resting_time', type: 'number', source: 'api_doc', description: 'Resting time (seconds)' },
      { path: 'data[].target_calories', type: 'number', source: 'api_doc', description: 'Daily calorie target' },
      { path: 'data[].class_5_min', type: 'string', source: 'api_doc', description: 'Activity classification per 5-min (encoded)' },
      { path: 'data[].met.interval', type: 'number', source: 'api_doc', description: 'MET sample interval (seconds)' },
      { path: 'data[].met.items[]', type: 'number[]', source: 'api_doc', description: 'MET values per interval' },
      { path: 'data[].contributors.meet_daily_targets', type: 'number', source: 'api_doc', description: 'Contributor score' },
      { path: 'data[].contributors.move_every_hour', type: 'number', source: 'api_doc', description: 'Contributor score' },
      { path: 'data[].contributors.recovery_time', type: 'number', source: 'api_doc', description: 'Contributor score' },
      { path: 'data[].contributors.stay_active', type: 'number', source: 'api_doc', description: 'Contributor score' },
      { path: 'data[].contributors.training_frequency', type: 'number', source: 'api_doc', description: 'Contributor score' },
      { path: 'data[].contributors.training_volume', type: 'number', source: 'api_doc', description: 'Contributor score' },
    ],
  },

  daily_readiness: {
    endpoint: 'GET /v2/usercollection/daily_readiness',
    docsUrl: 'https://cloud.ouraring.com/v2/docs#tag/Daily-Readiness',
    status: 'empty',
    fields: [
      { path: 'data[].id', type: 'string', source: 'api_doc', description: 'Document ID' },
      { path: 'data[].day', type: 'string', source: 'api_doc', description: 'Date (YYYY-MM-DD)' },
      { path: 'data[].score', type: 'number', source: 'api_doc', description: 'Readiness score (0-100)' },
      { path: 'data[].temperature_deviation', type: 'number', source: 'api_doc', description: 'Skin temp deviation from baseline' },
      { path: 'data[].temperature_trend_deviation', type: 'number', source: 'api_doc', description: 'Temp trend deviation' },
      { path: 'data[].contributors.activity_balance', type: 'number', source: 'api_doc', description: 'Contributor score' },
      { path: 'data[].contributors.body_temperature', type: 'number', source: 'api_doc', description: 'Contributor score' },
      { path: 'data[].contributors.hrv_balance', type: 'number', source: 'api_doc', description: 'Contributor score' },
      { path: 'data[].contributors.previous_day_activity', type: 'number', source: 'api_doc', description: 'Contributor score' },
      { path: 'data[].contributors.previous_night', type: 'number', source: 'api_doc', description: 'Contributor score' },
      { path: 'data[].contributors.recovery_index', type: 'number', source: 'api_doc', description: 'Contributor score' },
      { path: 'data[].contributors.resting_heart_rate', type: 'number', source: 'api_doc', description: 'Contributor score' },
      { path: 'data[].contributors.sleep_balance', type: 'number', source: 'api_doc', description: 'Contributor score' },
    ],
  },

  daily_sleep: {
    endpoint: 'GET /v2/usercollection/daily_sleep',
    docsUrl: 'https://cloud.ouraring.com/v2/docs#tag/Daily-Sleep',
    status: 'empty',
    fields: [
      { path: 'data[].id', type: 'string', source: 'api_doc', description: 'Document ID' },
      { path: 'data[].day', type: 'string', source: 'api_doc', description: 'Date (YYYY-MM-DD)' },
      { path: 'data[].score', type: 'number', source: 'api_doc', description: 'Sleep score (0-100)' },
      { path: 'data[].contributors.deep_sleep', type: 'number', source: 'api_doc', description: 'Deep sleep contributor' },
      { path: 'data[].contributors.efficiency', type: 'number', source: 'api_doc', description: 'Efficiency contributor' },
      { path: 'data[].contributors.latency', type: 'number', source: 'api_doc', description: 'Latency contributor' },
      { path: 'data[].contributors.rem_sleep', type: 'number', source: 'api_doc', description: 'REM sleep contributor' },
      { path: 'data[].contributors.restfulness', type: 'number', source: 'api_doc', description: 'Restfulness contributor' },
      { path: 'data[].contributors.timing', type: 'number', source: 'api_doc', description: 'Timing contributor' },
      { path: 'data[].contributors.total_sleep', type: 'number', source: 'api_doc', description: 'Total sleep contributor' },
    ],
  },

  sleep: {
    endpoint: 'GET /v2/usercollection/sleep',
    docsUrl: 'https://cloud.ouraring.com/v2/docs#tag/Sleep',
    status: 'empty',
    fields: [
      { path: 'data[].id', type: 'string', source: 'api_doc', description: 'Document ID' },
      { path: 'data[].day', type: 'string', source: 'api_doc', description: 'Date (YYYY-MM-DD)' },
      { path: 'data[].bedtime_start', type: 'string', source: 'api_doc', description: 'Bedtime start (ISO 8601)' },
      { path: 'data[].bedtime_end', type: 'string', source: 'api_doc', description: 'Bedtime end (ISO 8601)' },
      { path: 'data[].total_sleep_duration', type: 'number', source: 'api_doc', description: 'Total sleep (seconds)' },
      { path: 'data[].deep_sleep_duration', type: 'number', source: 'api_doc', description: 'Deep sleep (seconds)' },
      { path: 'data[].rem_sleep_duration', type: 'number', source: 'api_doc', description: 'REM sleep (seconds)' },
      { path: 'data[].light_sleep_duration', type: 'number', source: 'api_doc', description: 'Light sleep (seconds)' },
      { path: 'data[].awake_time', type: 'number', source: 'api_doc', description: 'Awake time (seconds)' },
      { path: 'data[].latency', type: 'number', source: 'api_doc', description: 'Sleep onset latency (seconds)' },
      { path: 'data[].efficiency', type: 'number', source: 'api_doc', description: 'Sleep efficiency (0-100)' },
      { path: 'data[].average_breath', type: 'number', source: 'api_doc', description: 'Average breathing rate' },
      { path: 'data[].average_heart_rate', type: 'number', source: 'api_doc', description: 'Average heart rate' },
      { path: 'data[].average_hrv', type: 'number', source: 'api_doc', description: 'Average HRV (rMSSD ms)' },
      { path: 'data[].lowest_heart_rate', type: 'number', source: 'api_doc', description: 'Lowest heart rate' },
      { path: 'data[].time_in_bed', type: 'number', source: 'api_doc', description: 'Time in bed (seconds)' },
      { path: 'data[].type', type: 'string', source: 'api_doc', description: 'long_sleep / sleep / rest / nap' },
      { path: 'data[].period', type: 'number', source: 'api_doc', description: 'Sleep period index' },
      { path: 'data[].is_longest', type: 'boolean', source: 'api_doc', description: 'Whether this is the longest sleep' },
      { path: 'data[].heart_rate.interval', type: 'number', source: 'api_doc', description: 'HR sample interval (seconds)' },
      { path: 'data[].heart_rate.items[]', type: 'number[]', source: 'api_doc', description: 'HR values per interval' },
      { path: 'data[].hrv.interval', type: 'number', source: 'api_doc', description: 'HRV sample interval (seconds)' },
      { path: 'data[].hrv.items[]', type: 'number[]', source: 'api_doc', description: 'HRV (rMSSD ms) per interval' },
      { path: 'data[].movement_30_sec', type: 'string', source: 'api_doc', description: 'Movement per 30s (encoded)' },
      { path: 'data[].sleep_phase_5_min', type: 'string', source: 'api_doc', description: 'Sleep phase per 5-min (encoded)' },
    ],
  },

  daily_spo2: {
    endpoint: 'GET /v2/usercollection/daily_spo2',
    docsUrl: 'https://cloud.ouraring.com/v2/docs#tag/Daily-SpO2',
    status: 'empty',
    fields: [
      { path: 'data[].id', type: 'string', source: 'api_doc', description: 'Document ID' },
      { path: 'data[].day', type: 'string', source: 'api_doc', description: 'Date (YYYY-MM-DD)' },
      { path: 'data[].spo2_percentage.average', type: 'number', source: 'api_doc', description: 'Average SpO2 %' },
    ],
  },

  daily_stress: {
    endpoint: 'GET /v2/usercollection/daily_stress',
    docsUrl: 'https://cloud.ouraring.com/v2/docs#tag/Daily-Stress',
    status: 'empty',
    fields: [
      { path: 'data[].id', type: 'string', source: 'api_doc', description: 'Document ID' },
      { path: 'data[].day', type: 'string', source: 'api_doc', description: 'Date (YYYY-MM-DD)' },
      { path: 'data[].stress_high', type: 'number', source: 'api_doc', description: 'High stress minutes' },
      { path: 'data[].recovery_high', type: 'number', source: 'api_doc', description: 'High recovery minutes' },
      { path: 'data[].day_summary', type: 'string', source: 'api_doc', description: 'restored / normal / stressful' },
    ],
  },

  daily_resilience: {
    endpoint: 'GET /v2/usercollection/daily_resilience',
    docsUrl: 'https://cloud.ouraring.com/v2/docs#tag/Daily-Resilience',
    status: 'empty',
    fields: [
      { path: 'data[].id', type: 'string', source: 'api_doc', description: 'Document ID' },
      { path: 'data[].day', type: 'string', source: 'api_doc', description: 'Date (YYYY-MM-DD)' },
      { path: 'data[].level', type: 'string', source: 'api_doc', description: 'Resilience level' },
      { path: 'data[].contributors.sleep_recovery', type: 'number', source: 'api_doc', description: 'Sleep recovery score (0-100)' },
      { path: 'data[].contributors.daytime_recovery', type: 'number', source: 'api_doc', description: 'Daytime recovery score (0-100)' },
      { path: 'data[].contributors.stress', type: 'number', source: 'api_doc', description: 'Stress score (0-100)' },
    ],
  },

  daily_cardiovascular_age: {
    endpoint: 'GET /v2/usercollection/daily_cardiovascular_age',
    docsUrl: 'https://cloud.ouraring.com/v2/docs#tag/Daily-Cardiovascular-Age',
    status: 'empty',
    fields: [
      { path: 'data[].id', type: 'string', source: 'api_doc', description: 'Document ID' },
      { path: 'data[].day', type: 'string', source: 'api_doc', description: 'Date (YYYY-MM-DD)' },
      { path: 'data[].vascular_age', type: 'number', source: 'api_doc', description: 'Estimated cardiovascular age (years)' },
    ],
  },

  heart_rate: {
    endpoint: 'GET /v2/usercollection/heartrate',
    docsUrl: 'https://cloud.ouraring.com/v2/docs#tag/Heart-Rate',
    status: 'empty',
    note: 'Uses start_datetime/end_datetime instead of start_date/end_date. Returns 5-minute interval HR data.',
    fields: [
      { path: 'data[].bpm', type: 'number', source: 'api_doc', description: 'Heart rate (beats per minute)' },
      { path: 'data[].source', type: 'string', source: 'api_doc', description: 'awake / rest / sleep / workout / unspecified' },
      { path: 'data[].timestamp', type: 'string', source: 'api_doc', description: 'ISO 8601 timestamp' },
    ],
  },

  workout: {
    endpoint: 'GET /v2/usercollection/workout',
    docsUrl: 'https://cloud.ouraring.com/v2/docs#tag/Workout',
    status: 'empty',
    fields: [
      { path: 'data[].id', type: 'string', source: 'api_doc', description: 'Document ID' },
      { path: 'data[].activity', type: 'string', source: 'api_doc', description: 'Workout type (e.g. running, cycling)' },
      { path: 'data[].calories', type: 'number', source: 'api_doc', description: 'Calories burned' },
      { path: 'data[].day', type: 'string', source: 'api_doc', description: 'Date (YYYY-MM-DD)' },
      { path: 'data[].distance', type: 'number', source: 'api_doc', description: 'Distance (meters)' },
      { path: 'data[].start_datetime', type: 'string', source: 'api_doc', description: 'Start time (ISO 8601)' },
      { path: 'data[].end_datetime', type: 'string', source: 'api_doc', description: 'End time (ISO 8601)' },
      { path: 'data[].intensity', type: 'string', source: 'api_doc', description: 'easy / moderate / hard' },
      { path: 'data[].label', type: 'string', source: 'api_doc', description: 'User label' },
      { path: 'data[].source', type: 'string', source: 'api_doc', description: 'manual / autodetected / confirmed' },
    ],
  },

  session: {
    endpoint: 'GET /v2/usercollection/session',
    docsUrl: 'https://cloud.ouraring.com/v2/docs#tag/Session',
    status: 'empty',
    fields: [
      { path: 'data[].id', type: 'string', source: 'api_doc', description: 'Document ID' },
      { path: 'data[].day', type: 'string', source: 'api_doc', description: 'Date (YYYY-MM-DD)' },
      { path: 'data[].start_datetime', type: 'string', source: 'api_doc', description: 'Start time (ISO 8601)' },
      { path: 'data[].end_datetime', type: 'string', source: 'api_doc', description: 'End time (ISO 8601)' },
      { path: 'data[].type', type: 'string', source: 'api_doc', description: 'breathing / meditation / nap / ...' },
      { path: 'data[].mood', type: 'string', source: 'api_doc', description: 'bad / worse / same / better / good' },
      { path: 'data[].heart_rate.interval', type: 'number', source: 'api_doc', description: 'HR sample interval (seconds)' },
      { path: 'data[].heart_rate.items[]', type: 'number[]', source: 'api_doc', description: 'HR values per interval' },
      { path: 'data[].heart_rate_variability.interval', type: 'number', source: 'api_doc', description: 'HRV sample interval (seconds)' },
      { path: 'data[].heart_rate_variability.items[]', type: 'number[]', source: 'api_doc', description: 'HRV (rMSSD ms) per interval' },
      { path: 'data[].motion_count.interval', type: 'number', source: 'api_doc', description: 'Motion count interval (seconds)' },
      { path: 'data[].motion_count.items[]', type: 'number[]', source: 'api_doc', description: 'Motion count values' },
    ],
  },

  sleep_time: {
    endpoint: 'GET /v2/usercollection/sleep_time',
    docsUrl: 'https://cloud.ouraring.com/v2/docs#tag/Sleep-Time',
    status: 'empty',
    fields: [
      { path: 'data[].id', type: 'string', source: 'api_doc', description: 'Document ID' },
      { path: 'data[].day', type: 'string', source: 'api_doc', description: 'Date (YYYY-MM-DD)' },
      { path: 'data[].optimal_bedtime.day_tz', type: 'number', source: 'api_doc', description: 'Timezone offset' },
      { path: 'data[].optimal_bedtime.end_offset', type: 'number', source: 'api_doc', description: 'End offset from midnight (seconds)' },
      { path: 'data[].optimal_bedtime.start_offset', type: 'number', source: 'api_doc', description: 'Start offset from midnight (seconds)' },
      { path: 'data[].recommendation', type: 'string', source: 'api_doc', description: 'improve_efficiency / earlier_bedtime / ...' },
      { path: 'data[].status', type: 'string', source: 'api_doc', description: 'not_enough_data / good_sleep / ...' },
    ],
  },

  vo2_max: {
    endpoint: 'GET /v2/usercollection/vo2_max',
    docsUrl: 'https://cloud.ouraring.com/v2/docs#tag/VO2-Max',
    status: 'empty',
    fields: [
      { path: 'data[].id', type: 'string', source: 'api_doc', description: 'Document ID' },
      { path: 'data[].day', type: 'string', source: 'api_doc', description: 'Date (YYYY-MM-DD)' },
      { path: 'data[].vo2_max', type: 'number', source: 'api_doc', description: 'VO2 max estimate (mL/min/kg)' },
    ],
  },

  ring_configuration: {
    endpoint: 'GET /v2/usercollection/ring_configuration',
    docsUrl: 'https://cloud.ouraring.com/v2/docs#tag/Ring-Configuration',
    status: 'empty',
    note: 'No date parameters — returns all ring configurations.',
    fields: [
      { path: 'data[].id', type: 'string', source: 'api_doc', description: 'Document ID' },
      { path: 'data[].color', type: 'string', source: 'api_doc', description: 'Ring color (e.g. glossy_black)' },
      { path: 'data[].design', type: 'string', source: 'api_doc', description: 'Ring design (e.g. heritage)' },
      { path: 'data[].firmware_version', type: 'string', source: 'api_doc', description: 'Firmware version' },
      { path: 'data[].hardware_type', type: 'string', source: 'api_doc', description: 'Hardware type (gen3 / gen4)' },
      { path: 'data[].set_up_at', type: 'string', source: 'api_doc', description: 'Setup timestamp' },
      { path: 'data[].size', type: 'number', source: 'api_doc', description: 'Ring size' },
    ],
  },

  // ─── Newly added endpoints (were previously not collected) ───

  rest_mode_period: {
    endpoint: 'GET /v2/usercollection/rest_mode_period',
    docsUrl: 'https://cloud.ouraring.com/v2/docs#tag/Rest-Mode-Period',
    status: 'newly_added',
    notCollectedReason: 'Overlooked in initial implementation. Uses the "daily" scope which was already requested.',
    fields: [
      { path: 'data[].id', type: 'string', source: 'api_doc', description: 'Document ID' },
      { path: 'data[].start_day', type: 'string', source: 'api_doc', description: 'Start date (YYYY-MM-DD)' },
      { path: 'data[].start_time', type: 'string', source: 'api_doc', description: 'Start time (ISO 8601)' },
      { path: 'data[].end_day', type: 'string', source: 'api_doc', description: 'End date (YYYY-MM-DD)' },
      { path: 'data[].end_time', type: 'string', source: 'api_doc', description: 'End time (ISO 8601)' },
      { path: 'data[].episodes[].tags[]', type: 'string[]', source: 'api_doc', description: 'Episode tags' },
      { path: 'data[].episodes[].timestamp', type: 'string', source: 'api_doc', description: 'Episode timestamp' },
    ],
  },

  enhanced_tag: {
    endpoint: 'GET /v2/usercollection/enhanced_tag',
    docsUrl: 'https://cloud.ouraring.com/v2/docs#tag/Enhanced-Tag',
    status: 'newly_added',
    notCollectedReason: 'Required "tag" OAuth scope which was not originally requested. Added tag scope and endpoint.',
    fields: [
      { path: 'data[].id', type: 'string', source: 'api_doc', description: 'Document ID' },
      { path: 'data[].tag_type_code', type: 'string', source: 'api_doc', description: 'Tag type code' },
      { path: 'data[].start_time', type: 'string', source: 'api_doc', description: 'Start time (ISO 8601)' },
      { path: 'data[].end_time', type: 'string', source: 'api_doc', description: 'End time (ISO 8601)' },
      { path: 'data[].start_day', type: 'string', source: 'api_doc', description: 'Start date' },
      { path: 'data[].end_day', type: 'string', source: 'api_doc', description: 'End date' },
      { path: 'data[].comment', type: 'string', source: 'api_doc', description: 'User comment' },
    ],
  },

  tag: {
    endpoint: 'GET /v2/usercollection/tag',
    docsUrl: 'https://cloud.ouraring.com/v2/docs#tag/Tag',
    status: 'newly_added',
    notCollectedReason: 'Deprecated endpoint (replaced by enhanced_tag). Required "tag" OAuth scope which was not originally requested.',
    note: 'This endpoint is deprecated — use enhanced_tag instead.',
    fields: [
      { path: 'data[].id', type: 'string', source: 'api_doc', description: 'Document ID' },
      { path: 'data[].day', type: 'string', source: 'api_doc', description: 'Date (YYYY-MM-DD)' },
      { path: 'data[].text', type: 'string', source: 'api_doc', description: 'Tag text' },
      { path: 'data[].timestamp', type: 'string', source: 'api_doc', description: 'Timestamp' },
      { path: 'data[].tags[]', type: 'string[]', source: 'api_doc', description: 'Tag values' },
    ],
  },
}
