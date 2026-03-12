"""Xiaomi Mi Fitness file collector — parses JSON → JSONB."""
from __future__ import annotations

import json
import logging
from pathlib import Path

from .base import BaseCollector
from ..storage.payload_store import RawPayload

logger = logging.getLogger(__name__)


class XiaomiCollector(BaseCollector):
    device_type = "xiaomi"

    async def collect(self, file_path: str, user_id: str = "default", **kwargs) -> list[RawPayload]:
        """Parse Xiaomi Mi Fitness JSON export → JSONB payloads."""
        payloads: list[RawPayload] = []

        try:
            data = json.loads(Path(file_path).read_text(encoding="utf-8", errors="replace"))
        except Exception as e:
            logger.error(f"Xiaomi JSON parse error: {e}")
            return payloads

        # Xiaomi exports can be a single JSON or multiple files in a directory
        if isinstance(data, dict):
            # Single JSON with multiple data types
            for key, value in data.items():
                category = key.lower().replace(" ", "_")
                records = value if isinstance(value, list) else [value]
                payloads.append(RawPayload(
                    device_type=self.device_type,
                    data_category=category,
                    payload={"key": key, "data": value, "count": len(records)},
                    ingestion_method="file_upload",
                    source_file_name=Path(file_path).name,
                    user_id=user_id,
                ))
                logger.info(f"Xiaomi {category}: {len(records)} records")
        elif isinstance(data, list):
            # Array of records
            payloads.append(RawPayload(
                device_type=self.device_type,
                data_category="export",
                payload={"data": data, "count": len(data)},
                ingestion_method="file_upload",
                source_file_name=Path(file_path).name,
                user_id=user_id,
            ))

        return payloads
