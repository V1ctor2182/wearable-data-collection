"""Google Fit REST API collector — fetches all available data types."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone, date

import httpx
import asyncpg

from .base import BaseCollector
from ..storage.payload_store import RawPayload
from ..oauth.manager import get_valid_token

logger = logging.getLogger(__name__)

# Google Fit data source types
GOOGLE_FIT_DATA_TYPES = [
    ("steps",              "com.google.step_count.delta"),
    ("heart_rate",         "com.google.heart_rate.bpm"),
    ("calories",           "com.google.calories.expended"),
    ("distance",           "com.google.distance.delta"),
    ("activity_segment",   "com.google.activity.segment"),
    ("sleep_segment",      "com.google.sleep.segment"),
    ("weight",             "com.google.weight"),
    ("height",             "com.google.height"),
    ("body_fat",           "com.google.body.fat.percentage"),
    ("blood_pressure",     "com.google.blood_pressure"),
    ("blood_glucose",      "com.google.blood_glucose"),
    ("oxygen_saturation",  "com.google.oxygen_saturation"),
    ("body_temperature",   "com.google.body.temperature"),
    ("nutrition",          "com.google.nutrition"),
    ("hydration",          "com.google.hydration"),
    ("speed",              "com.google.speed"),
    ("cycling_cadence",    "com.google.cycling.pedaling.cadence"),
    ("power",              "com.google.power.sample"),
    ("location",           "com.google.location.sample"),
    ("active_minutes",     "com.google.active_minutes"),
]


class GoogleFitCollector(BaseCollector):
    device_type = "google_fit"

    def __init__(self, pool: asyncpg.Pool, user_id: str = "default"):
        self.pool = pool
        self.user_id = user_id

    async def collect(
        self,
        target_date: date | None = None,
        days_back: int = 1,
        **kwargs,
    ) -> list[RawPayload]:
        token = await get_valid_token(self.pool, "google_fit", self.user_id)
        payloads: list[RawPayload] = []

        if target_date is None:
            target_date = date.today()
        start_date = target_date - timedelta(days=days_back - 1)

        # Convert to nanoseconds (Google Fit uses nanos)
        start_ns = int(datetime.combine(start_date, datetime.min.time(), tzinfo=timezone.utc).timestamp() * 1e9)
        end_ns = int(datetime.combine(target_date, datetime.max.time(), tzinfo=timezone.utc).timestamp() * 1e9)

        async with httpx.AsyncClient(
            base_url="https://www.googleapis.com/fitness/v1",
            headers={"Authorization": f"Bearer {token}"},
            timeout=30.0,
        ) as client:
            # Method 1: Aggregate endpoint (daily summaries)
            for category, data_type in GOOGLE_FIT_DATA_TYPES:
                try:
                    body = {
                        "aggregateBy": [{"dataTypeName": data_type}],
                        "bucketByTime": {"durationMillis": 86400000},  # 1 day
                        "startTimeMillis": start_ns // 1_000_000,
                        "endTimeMillis": end_ns // 1_000_000,
                    }
                    resp = await client.post(
                        "/users/me/dataset:aggregate",
                        json=body,
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        payloads.append(RawPayload(
                            device_type=self.device_type,
                            data_category=f"{category}_aggregate",
                            payload=data,
                            data_start_time=datetime.combine(start_date, datetime.min.time(), tzinfo=timezone.utc),
                            data_end_time=datetime.combine(target_date, datetime.max.time(), tzinfo=timezone.utc),
                            api_endpoint=f"/users/me/dataset:aggregate ({data_type})",
                            ingestion_method="api_pull",
                            user_id=self.user_id,
                        ))
                        buckets = data.get("bucket", [])
                        logger.info(f"Google Fit {category} aggregate: OK ({len(buckets)} buckets)")
                    else:
                        logger.warning(f"Google Fit {category}: HTTP {resp.status_code}")
                except Exception as e:
                    logger.error(f"Google Fit {category} error: {e}")

            # Method 2: Raw data sources for intraday data
            try:
                resp = await client.get("/users/me/dataSources")
                if resp.status_code == 200:
                    sources_data = resp.json()
                    payloads.append(RawPayload(
                        device_type=self.device_type,
                        data_category="data_sources",
                        payload=sources_data,
                        api_endpoint="/users/me/dataSources",
                        ingestion_method="api_pull",
                        user_id=self.user_id,
                    ))

                    # Fetch raw datasets from each source
                    for source in sources_data.get("dataSource", []):
                        source_id = source.get("dataStreamId", "")
                        dataset_id = f"{start_ns}-{end_ns}"
                        try:
                            resp = await client.get(
                                f"/users/me/dataSources/{source_id}/datasets/{dataset_id}"
                            )
                            if resp.status_code == 200:
                                ds_data = resp.json()
                                points = ds_data.get("point", [])
                                if points:
                                    cat_name = source.get("dataType", {}).get("name", "unknown").replace("com.google.", "")
                                    payloads.append(RawPayload(
                                        device_type=self.device_type,
                                        data_category=f"raw_{cat_name}",
                                        payload=ds_data,
                                        data_start_time=datetime.combine(start_date, datetime.min.time(), tzinfo=timezone.utc),
                                        data_end_time=datetime.combine(target_date, datetime.max.time(), tzinfo=timezone.utc),
                                        api_endpoint=f"/users/me/dataSources/{source_id}/datasets/{dataset_id}",
                                        ingestion_method="api_pull",
                                        user_id=self.user_id,
                                    ))
                                    logger.info(f"Google Fit raw {cat_name}: {len(points)} points")
                        except Exception as e:
                            logger.debug(f"Google Fit source {source_id} error: {e}")
            except Exception as e:
                logger.error(f"Google Fit dataSources error: {e}")

        return payloads
