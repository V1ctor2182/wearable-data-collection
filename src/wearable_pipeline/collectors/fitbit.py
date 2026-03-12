"""Fitbit OAuth API collector — fetches ALL available endpoints."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone, date

import httpx
import asyncpg

from .base import BaseCollector
from ..storage.payload_store import RawPayload
from ..oauth.manager import get_valid_token

logger = logging.getLogger(__name__)

# All Fitbit API endpoints we want to collect
FITBIT_ENDPOINTS = [
    # Heart Rate
    ("heart_rate",       "/1/user/-/activities/heart/date/{date}/1d/1sec.json"),
    ("heart_rate_zones", "/1/user/-/activities/heart/date/{date}/1d.json"),
    # HRV
    ("hrv",              "/1/user/-/hrv/date/{date}.json"),
    ("hrv_intraday",     "/1/user/-/hrv/date/{date}/all.json"),
    # Sleep
    ("sleep",            "/1.2/user/-/sleep/date/{date}.json"),
    # Activity
    ("activity_summary", "/1/user/-/activities/date/{date}.json"),
    ("steps_intraday",   "/1/user/-/activities/steps/date/{date}/1d/1min.json"),
    ("calories_intraday", "/1/user/-/activities/calories/date/{date}/1d/15min.json"),
    ("distance_intraday", "/1/user/-/activities/distance/date/{date}/1d/1min.json"),
    # Active Zone Minutes
    ("azm",              "/1/user/-/activities/active-zone-minutes/date/{date}/1d.json"),
    # Breathing Rate
    ("breathing_rate",   "/1/user/-/br/date/{date}.json"),
    # SpO2
    ("spo2",             "/1/user/-/spo2/date/{date}.json"),
    ("spo2_intraday",    "/1/user/-/spo2/date/{date}/all.json"),
    # Temperature
    ("skin_temperature", "/1/user/-/temp/skin/date/{date}.json"),
    ("core_temperature", "/1/user/-/temp/core/date/{date}.json"),
    # Body
    ("body_weight",      "/1/user/-/body/log/weight/date/{date}.json"),
    ("body_fat",         "/1/user/-/body/log/fat/date/{date}.json"),
    # Cardio Fitness (VO2 Max)
    ("vo2max",           "/1/user/-/cardioscore/date/{date}.json"),
    # ECG
    ("ecg",              "/1/user/-/ecg/list.json"),
    # Devices
    ("devices",          "/1/user/-/devices.json"),
    # Profile
    ("profile",          "/1/user/-/profile.json"),
    # Nutrition (requires 'nutrition' scope)
    ("food_log",         "/1/user/-/foods/log/date/{date}.json"),
    ("water_log",        "/1/user/-/foods/log/water/date/{date}.json"),
    # Activity Log List (individual exercise sessions)
    ("activity_log",     "/1/user/-/activities/list.json?afterDate={date}&sort=asc&limit=100&offset=0"),
    # Lifetime Stats
    ("lifetime_stats",   "/1/user/-/activities.json"),
    # Irregular Rhythm Notifications (AFib)
    ("irn_alerts",       "/1/user/-/irn/alerts/list.json?afterDate={date}&sort=asc&limit=10&offset=0"),
    # Breathing Rate Intraday
    ("breathing_rate_intraday", "/1/user/-/br/date/{date}/all.json"),
]


class FitbitCollector(BaseCollector):
    device_type = "fitbit"

    def __init__(self, pool: asyncpg.Pool, user_id: str = "default"):
        self.pool = pool
        self.user_id = user_id

    async def collect(
        self,
        target_date: date | None = None,
        days_back: int = 1,
        **kwargs,
    ) -> list[RawPayload]:
        """Fetch all Fitbit endpoints for given date range."""
        token = await get_valid_token(self.pool, "fitbit", self.user_id)
        payloads: list[RawPayload] = []

        if target_date is None:
            target_date = date.today()

        dates = [target_date - timedelta(days=i) for i in range(days_back)]

        async with httpx.AsyncClient(
            base_url="https://api.fitbit.com",
            headers={"Authorization": f"Bearer {token}"},
            timeout=30.0,
        ) as client:
            for d in dates:
                date_str = d.isoformat()
                for category, endpoint_template in FITBIT_ENDPOINTS:
                    endpoint = endpoint_template.replace("{date}", date_str)
                    try:
                        resp = await client.get(endpoint)
                        if resp.status_code == 200:
                            data = resp.json()
                            payloads.append(RawPayload(
                                device_type=self.device_type,
                                data_category=category,
                                payload=data,
                                data_start_time=datetime.combine(d, datetime.min.time(), tzinfo=timezone.utc),
                                data_end_time=datetime.combine(d, datetime.max.time(), tzinfo=timezone.utc),
                                api_endpoint=endpoint,
                                ingestion_method="api_pull",
                                user_id=self.user_id,
                            ))
                            logger.info(f"Fitbit {category} for {date_str}: OK")
                        elif resp.status_code == 429:
                            logger.warning(f"Fitbit rate limited on {endpoint}")
                            break  # Stop for this date
                        else:
                            logger.warning(f"Fitbit {category} {date_str}: HTTP {resp.status_code}")
                    except Exception as e:
                        logger.error(f"Fitbit {category} {date_str} error: {e}")

        return payloads
