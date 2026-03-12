"""WHOOP API collector — fetches all available endpoints."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone, date

import httpx
import asyncpg

from .base import BaseCollector
from ..storage.payload_store import RawPayload
from ..oauth.manager import get_valid_token

logger = logging.getLogger(__name__)

WHOOP_ENDPOINTS = [
    ("cycle",            "/v1/cycle"),
    ("recovery",         "/v1/recovery"),
    ("sleep",            "/v1/activity/sleep"),
    ("workout",          "/v1/activity/workout"),
    ("body_measurement", "/v1/user/measurement/body"),
    ("profile",          "/v1/user/profile/basic"),
]


class WhoopCollector(BaseCollector):
    device_type = "whoop"

    def __init__(self, pool: asyncpg.Pool, user_id: str = "default"):
        self.pool = pool
        self.user_id = user_id

    async def collect(
        self,
        target_date: date | None = None,
        days_back: int = 7,
        **kwargs,
    ) -> list[RawPayload]:
        token = await get_valid_token(self.pool, "whoop", self.user_id)
        payloads: list[RawPayload] = []

        if target_date is None:
            target_date = date.today()
        start_date = target_date - timedelta(days=days_back - 1)

        start_dt = datetime.combine(start_date, datetime.min.time(), tzinfo=timezone.utc)
        end_dt = datetime.combine(target_date, datetime.max.time(), tzinfo=timezone.utc)

        async with httpx.AsyncClient(
            base_url="https://api.prod.whoop.com/developer",
            headers={"Authorization": f"Bearer {token}"},
            timeout=30.0,
        ) as client:
            for category, endpoint in WHOOP_ENDPOINTS:
                try:
                    params = {}
                    if category not in ("body_measurement", "profile"):
                        params = {
                            "start": start_dt.isoformat(),
                            "end": end_dt.isoformat(),
                            "limit": 25,
                        }

                    resp = await client.get(endpoint, params=params)
                    if resp.status_code == 200:
                        data = resp.json()
                        payloads.append(RawPayload(
                            device_type=self.device_type,
                            data_category=category,
                            payload=data,
                            data_start_time=start_dt,
                            data_end_time=end_dt,
                            api_endpoint=endpoint,
                            ingestion_method="api_pull",
                            user_id=self.user_id,
                        ))
                        records = data.get("records", data.get("data", []))
                        count = len(records) if isinstance(records, list) else 1
                        logger.info(f"WHOOP {category}: OK ({count} records)")

                        # Handle pagination
                        next_token = data.get("next_token")
                        while next_token:
                            resp = await client.get(endpoint, params={**params, "nextToken": next_token})
                            if resp.status_code == 200:
                                page_data = resp.json()
                                payloads.append(RawPayload(
                                    device_type=self.device_type,
                                    data_category=category,
                                    payload=page_data,
                                    data_start_time=start_dt,
                                    data_end_time=end_dt,
                                    api_endpoint=endpoint,
                                    ingestion_method="api_pull",
                                    user_id=self.user_id,
                                ))
                                next_token = page_data.get("next_token")
                            else:
                                break
                    else:
                        logger.warning(f"WHOOP {category}: HTTP {resp.status_code}")
                except Exception as e:
                    logger.error(f"WHOOP {category} error: {e}")

        return payloads
