"""Health Connect (Android) file collector — parses ZIP/JSON → JSONB."""
from __future__ import annotations

import json
import logging
import zipfile
import tempfile
from pathlib import Path

from .base import BaseCollector
from ..storage.payload_store import RawPayload

logger = logging.getLogger(__name__)


class HealthConnectCollector(BaseCollector):
    device_type = "health_connect"

    async def collect(self, file_path: str, user_id: str = "default", **kwargs) -> list[RawPayload]:
        """Parse Health Connect export ZIP → JSONB (one payload per JSON file)."""
        payloads: list[RawPayload] = []

        with tempfile.TemporaryDirectory() as tmp_dir:
            if file_path.lower().endswith(".zip"):
                with zipfile.ZipFile(file_path, "r") as z:
                    z.extractall(tmp_dir)
                json_files = list(Path(tmp_dir).rglob("*.json"))
            else:
                json_files = [Path(file_path)]

            for jf in json_files:
                try:
                    data = json.loads(jf.read_text(encoding="utf-8", errors="replace"))
                    # Category from filename: Steps.json → steps, HeartRate.json → heart_rate
                    category = _classify_hc_file(jf.stem)

                    records = data if isinstance(data, list) else data.get("records", data.get("data", [data]))
                    count = len(records) if isinstance(records, list) else 1

                    payloads.append(RawPayload(
                        device_type=self.device_type,
                        data_category=category,
                        payload={"file_name": jf.name, "data": data, "count": count},
                        ingestion_method="file_upload",
                        source_file_name=Path(file_path).name,
                        user_id=user_id,
                    ))
                    logger.info(f"Health Connect {category}: {count} records")

                except Exception as e:
                    logger.error(f"Health Connect parse error {jf.name}: {e}")

        return payloads


def _classify_hc_file(stem: str) -> str:
    """Convert Health Connect filename to category. CamelCase → snake_case."""
    import re
    # StepsRecord → steps_record → steps
    snake = re.sub(r"(?<!^)(?=[A-Z])", "_", stem).lower()
    return snake.replace("_record", "").replace("_session", "")
