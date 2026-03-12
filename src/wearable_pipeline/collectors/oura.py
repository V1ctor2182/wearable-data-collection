"""Oura Ring V2 API collector — fetches ALL available endpoints."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone, date

import httpx
import asyncpg

from .base import BaseCollector
from ..storage.payload_store import RawPayload
from ..oauth.manager import get_valid_token

logger = logging.getLogger(__name__)

OURA_ENDPOINTS = [
    ("sleep",               "/v2/usercollection/sleep"),
    ("daily_sleep",         "/v2/usercollection/daily_sleep"),
    ("daily_activity",      "/v2/usercollection/daily_activity"),
    ("daily_readiness",     "/v2/usercollection/daily_readiness"),
    ("daily_spo2",          "/v2/usercollection/daily_spo2"),
    ("daily_stress",        "/v2/usercollection/daily_stress"),
    ("daily_resilience",    "/v2/usercollection/daily_resilience"),
    ("daily_cardiovascular_age", "/v2/usercollection/daily_cardiovascular_age"),
    ("heart_rate",          "/v2/usercollection/heartrate"),
    ("workout",             "/v2/usercollection/workout"),
    ("session",             "/v2/usercollection/session"),
    ("sleep_time",          "/v2/usercollection/sleep_time"),
    ("vo2_max",             "/v2/usercollection/vo2_max"),
    ("ring_configuration",  "/v2/usercollection/ring_configuration"),
    ("personal_info",       "/v2/usercollection/personal_info"),
    # ─── Newly added endpoints ───
    ("rest_mode_period",    "/v2/usercollection/rest_mode_period"),
    ("tag",                 "/v2/usercollection/tag"),
    ("enhanced_tag",        "/v2/usercollection/enhanced_tag"),
]


class OuraCollector(BaseCollector):
    device_type = "oura"

    def __init__(self, pool: asyncpg.Pool, user_id: str = "default"):
        self.pool = pool
        self.user_id = user_id

    async def collect(
        self,
        target_date: date | None = None,
        days_back: int = 1,
        **kwargs,
    ) -> list[RawPayload]:
        token = await get_valid_token(self.pool, "oura", self.user_id)
        payloads: list[RawPayload] = []

        if target_date is None:
            target_date = date.today()

        start_date = target_date - timedelta(days=days_back - 1)

        async with httpx.AsyncClient(
            base_url="https://api.ouraring.com",
            headers={"Authorization": f"Bearer {token}"},
            timeout=30.0,
        ) as client:
            for category, endpoint in OURA_ENDPOINTS:
                try:
                    params = {
                        "start_date": start_date.isoformat(),
                        "end_date": target_date.isoformat(),
                    }
                    # Some endpoints don't take date params
                    if category in ("ring_configuration", "personal_info"):
                        params = {}

                    resp = await client.get(endpoint, params=params)
                    if resp.status_code == 200:
                        data = resp.json()
                        # Oura V2 returns paginated results with 'data' key
                        # Store the entire response including pagination info
                        payloads.append(RawPayload(
                            device_type=self.device_type,
                            data_category=category,
                            payload=data,
                            data_start_time=datetime.combine(start_date, datetime.min.time(), tzinfo=timezone.utc),
                            data_end_time=datetime.combine(target_date, datetime.max.time(), tzinfo=timezone.utc),
                            api_endpoint=endpoint,
                            ingestion_method="api_pull",
                            user_id=self.user_id,
                        ))
                        logger.info(f"Oura {category}: OK ({len(data.get('data', []))} records)")

                        # Handle pagination
                        next_token = data.get("next_token")
                        while next_token:
                            resp = await client.get(endpoint, params={**params, "next_token": next_token})
                            if resp.status_code == 200:
                                page_data = resp.json()
                                payloads.append(RawPayload(
                                    device_type=self.device_type,
                                    data_category=category,
                                    payload=page_data,
                                    data_start_time=datetime.combine(start_date, datetime.min.time(), tzinfo=timezone.utc),
                                    data_end_time=datetime.combine(target_date, datetime.max.time(), tzinfo=timezone.utc),
                                    api_endpoint=f"{endpoint}?next_token={next_token}",
                                    ingestion_method="api_pull",
                                    user_id=self.user_id,
                                ))
                                next_token = page_data.get("next_token")
                            else:
                                break
                    elif resp.status_code == 429:
                        logger.warning(f"Oura rate limited on {endpoint}")
                    else:
                        logger.warning(f"Oura {category}: HTTP {resp.status_code}")
                except Exception as e:
                    logger.error(f"Oura {category} error: {e}")

        return payloads
