"""Samsung Health file collector — parses ZIP/CSV → JSONB with ALL fields."""
from __future__ import annotations

import csv
import io
import logging
import zipfile
import tempfile
from pathlib import Path
from datetime import datetime, timezone

from .base import BaseCollector
from ..storage.payload_store import RawPayload

logger = logging.getLogger(__name__)


class SamsungCollector(BaseCollector):
    device_type = "samsung"

    async def collect(self, file_path: str, user_id: str = "default", **kwargs) -> list[RawPayload]:
        """Parse Samsung Health export ZIP → JSONB payloads (one per CSV file)."""
        payloads: list[RawPayload] = []

        with tempfile.TemporaryDirectory() as tmp_dir:
            # Could be ZIP or single CSV
            if file_path.lower().endswith(".zip"):
                with zipfile.ZipFile(file_path, "r") as z:
                    z.extractall(tmp_dir)
                csv_files = list(Path(tmp_dir).rglob("*.csv"))
            else:
                csv_files = [Path(file_path)]

            for csv_path in csv_files:
                try:
                    # Read CSV, skip Samsung header lines (lines starting with com.samsung)
                    content = csv_path.read_text(encoding="utf-8", errors="replace")
                    lines = content.split("\n")

                    # Find actual header row (Samsung CSVs sometimes have metadata rows)
                    data_lines = []
                    for line in lines:
                        if line.strip() and not line.startswith("com.samsung"):
                            data_lines.append(line)

                    if len(data_lines) < 2:
                        continue

                    reader = csv.DictReader(io.StringIO("\n".join(data_lines)))
                    records = list(reader)

                    if not records:
                        continue

                    # Determine category from filename
                    fname = csv_path.stem.lower()
                    category = _classify_samsung_file(fname)

                    payloads.append(RawPayload(
                        device_type=self.device_type,
                        data_category=category,
                        payload={
                            "file_name": csv_path.name,
                            "headers": list(records[0].keys()) if records else [],
                            "records": records,
                            "count": len(records),
                        },
                        ingestion_method="file_upload",
                        source_file_name=Path(file_path).name,
                        user_id=user_id,
                    ))
                    logger.info(f"Samsung {category} ({csv_path.name}): {len(records)} records")

                except Exception as e:
                    logger.error(f"Samsung parse error {csv_path.name}: {e}")

            # Also look for JSON files (Samsung sometimes includes these)
            json_files = list(Path(tmp_dir).rglob("*.json"))
            for json_path in json_files:
                try:
                    import json
                    data = json.loads(json_path.read_text(encoding="utf-8", errors="replace"))
                    category = _classify_samsung_file(json_path.stem.lower())
                    payloads.append(RawPayload(
                        device_type=self.device_type,
                        data_category=f"{category}_json",
                        payload={"file_name": json_path.name, "data": data},
                        ingestion_method="file_upload",
                        source_file_name=Path(file_path).name,
                        user_id=user_id,
                    ))
                    logger.info(f"Samsung JSON {json_path.name}: stored")
                except Exception as e:
                    logger.error(f"Samsung JSON parse error {json_path.name}: {e}")

        return payloads


def _classify_samsung_file(fname: str) -> str:
    """Classify Samsung file by name to a data category."""
    mapping = {
        "heart_rate": "heart_rate",
        "sleep": "sleep",
        "sleep_stage": "sleep_stage",
        "step": "steps",
        "exercise": "exercise",
        "blood_pressure": "blood_pressure",
        "blood_glucose": "blood_glucose",
        "body_composition": "body_composition",
        "oxygen": "spo2",
        "stress": "stress",
        "water": "water_intake",
        "caffeine": "caffeine",
        "food": "nutrition",
        "floor": "floors",
    }
    for key, cat in mapping.items():
        if key in fname:
            return cat
    return "other"
