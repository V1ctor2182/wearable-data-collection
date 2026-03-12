"""Terra webhook collector — stores complete webhook payloads as JSONB."""
from __future__ import annotations

import logging

from .base import BaseCollector
from ..storage.payload_store import RawPayload

logger = logging.getLogger(__name__)


class TerraCollector(BaseCollector):
    device_type = "terra"

    async def collect(self, webhook_payload: dict, user_id: str = "default", **kwargs) -> list[RawPayload]:
        """Process a Terra webhook payload → store complete JSONB."""
        payloads: list[RawPayload] = []

        event_type = webhook_payload.get("type", "unknown")
        # Terra event types: activity, sleep, body, daily, nutrition, menstruation
        category_map = {
            "activity": "activity",
            "sleep": "sleep",
            "body": "body",
            "daily": "daily",
            "nutrition": "nutrition",
            "menstruation": "menstruation",
            "athlete": "athlete",
        }
        category = category_map.get(event_type, event_type)

        # Store the entire webhook payload as-is
        payloads.append(RawPayload(
            device_type=self.device_type,
            data_category=category,
            payload=webhook_payload,
            api_endpoint=f"webhook/{event_type}",
            ingestion_method="webhook",
            user_id=user_id,
        ))

        # Also store individual data items if present
        data = webhook_payload.get("data", [])
        if isinstance(data, list):
            for i, item in enumerate(data):
                payloads.append(RawPayload(
                    device_type=self.device_type,
                    data_category=f"{category}_item",
                    payload=item,
                    api_endpoint=f"webhook/{event_type}/item/{i}",
                    ingestion_method="webhook",
                    user_id=user_id,
                ))

        logger.info(f"Terra webhook {event_type}: {len(payloads)} payloads")
        return payloads
