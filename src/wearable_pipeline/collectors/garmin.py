"""Garmin FIT file collector — parses .FIT binary → JSONB with ALL fields."""
from __future__ import annotations

import logging
from pathlib import Path
from datetime import datetime, timezone

from .base import BaseCollector
from ..storage.payload_store import RawPayload

logger = logging.getLogger(__name__)


class GarminCollector(BaseCollector):
    device_type = "garmin"

    async def collect(self, file_path: str, user_id: str = "default", **kwargs) -> list[RawPayload]:
        """Parse Garmin .FIT file → list of RawPayload (one per message type)."""
        try:
            from fitparse import FitFile
        except ImportError:
            logger.error("fitparse not installed. Run: pip install fitparse")
            return []

        payloads: list[RawPayload] = []
        fit = FitFile(file_path)

        messages_by_type: dict[str, list[dict]] = {}

        for record in fit.get_messages():
            msg_type = record.name
            if msg_type not in messages_by_type:
                messages_by_type[msg_type] = []

            fields = {}
            for field in record.fields:
                val = field.value
                # Convert datetime objects to ISO strings
                if isinstance(val, datetime):
                    val = val.isoformat()
                fields[field.name] = val

            messages_by_type[msg_type].append(fields)

        # Store each message type as a separate payload
        for msg_type, messages in messages_by_type.items():
            start_time = None
            end_time = None
            # Try to extract time range from records
            if msg_type == "record" and messages:
                timestamps = [m.get("timestamp") for m in messages if m.get("timestamp")]
                if timestamps:
                    try:
                        start_time = datetime.fromisoformat(min(timestamps))
                        end_time = datetime.fromisoformat(max(timestamps))
                    except Exception:
                        pass

            payloads.append(RawPayload(
                device_type=self.device_type,
                data_category=msg_type,
                payload={"message_type": msg_type, "records": messages, "count": len(messages)},
                data_start_time=start_time,
                data_end_time=end_time,
                ingestion_method="file_upload",
                source_file_name=Path(file_path).name,
                user_id=user_id,
            ))
            logger.info(f"Garmin FIT {msg_type}: {len(messages)} records")

        return payloads
