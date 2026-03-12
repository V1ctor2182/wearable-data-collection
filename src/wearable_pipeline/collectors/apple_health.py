"""Apple Health file collector — parses export.zip → export.xml → JSONB."""
from __future__ import annotations

import logging
import zipfile
import tempfile
from pathlib import Path
from datetime import datetime, timezone
from xml.etree import ElementTree as ET
from collections import defaultdict

from .base import BaseCollector
from ..storage.payload_store import RawPayload

logger = logging.getLogger(__name__)

# Batch size for grouping records
BATCH_SIZE = 500


class AppleHealthCollector(BaseCollector):
    device_type = "apple_health"

    async def collect(self, file_path: str, user_id: str = "default", **kwargs) -> list[RawPayload]:
        """Parse Apple Health export.zip → list of RawPayload (one per data type batch)."""
        payloads: list[RawPayload] = []

        # Extract ZIP
        with tempfile.TemporaryDirectory() as tmp_dir:
            with zipfile.ZipFile(file_path, "r") as z:
                z.extractall(tmp_dir)

            # Find export.xml
            xml_path = None
            for p in Path(tmp_dir).rglob("export.xml"):
                xml_path = p
                break
            if not xml_path:
                # Try apple_health_export/export.xml
                for p in Path(tmp_dir).rglob("*.xml"):
                    xml_path = p
                    break

            if not xml_path:
                logger.error("No export.xml found in ZIP")
                return payloads

            logger.info(f"Parsing Apple Health XML: {xml_path}")

            # Parse XML iteratively (can be huge files)
            records_by_type: dict[str, list[dict]] = defaultdict(list)
            workouts: list[dict] = []
            me_record: dict | None = None

            for event, elem in ET.iterparse(str(xml_path), events=("end",)):
                if elem.tag == "Record":
                    rec_type = elem.get("type", "Unknown")
                    record = dict(elem.attrib)
                    # Include MetadataEntry children
                    metadata = {}
                    for meta in elem.findall("MetadataEntry"):
                        metadata[meta.get("key", "")] = meta.get("value", "")
                    if metadata:
                        record["metadata"] = metadata
                    records_by_type[rec_type].append(record)
                    elem.clear()

                elif elem.tag == "Workout":
                    workout = dict(elem.attrib)
                    # Include WorkoutEvent and WorkoutRoute children
                    events = []
                    for we in elem.findall("WorkoutEvent"):
                        events.append(dict(we.attrib))
                    if events:
                        workout["events"] = events
                    # WorkoutStatistics
                    stats = []
                    for ws in elem.findall("WorkoutStatistics"):
                        stats.append(dict(ws.attrib))
                    if stats:
                        workout["statistics"] = stats
                    workouts.append(workout)
                    elem.clear()

                elif elem.tag == "Me":
                    me_record = dict(elem.attrib)
                    elem.clear()

            # Store Me record
            if me_record:
                payloads.append(RawPayload(
                    device_type=self.device_type,
                    data_category="user_profile",
                    payload=me_record,
                    ingestion_method="file_upload",
                    source_file_name=Path(file_path).name,
                    user_id=user_id,
                ))

            # Store records grouped by type, batched
            for rec_type, records in records_by_type.items():
                # Simplify type name: HKQuantityTypeIdentifierHeartRate → HeartRate
                simple_type = rec_type.replace("HKQuantityTypeIdentifier", "").replace("HKCategoryTypeIdentifier", "")
                category = f"record_{simple_type}"

                for i in range(0, len(records), BATCH_SIZE):
                    batch = records[i:i + BATCH_SIZE]
                    # Try to get time range
                    start_time = None
                    end_time = None
                    try:
                        dates = [r.get("startDate", r.get("creationDate", "")) for r in batch if r.get("startDate") or r.get("creationDate")]
                        if dates:
                            start_time = _parse_apple_date(min(dates))
                            end_time = _parse_apple_date(max(dates))
                    except Exception:
                        pass

                    payloads.append(RawPayload(
                        device_type=self.device_type,
                        data_category=category,
                        payload={"type": rec_type, "records": batch, "count": len(batch), "batch_index": i // BATCH_SIZE},
                        data_start_time=start_time,
                        data_end_time=end_time,
                        ingestion_method="file_upload",
                        source_file_name=Path(file_path).name,
                        user_id=user_id,
                    ))

                logger.info(f"Apple Health {simple_type}: {len(records)} records")

            # Store workouts
            if workouts:
                payloads.append(RawPayload(
                    device_type=self.device_type,
                    data_category="workouts",
                    payload={"workouts": workouts, "count": len(workouts)},
                    ingestion_method="file_upload",
                    source_file_name=Path(file_path).name,
                    user_id=user_id,
                ))
                logger.info(f"Apple Health workouts: {len(workouts)}")

            logger.info(f"Apple Health total: {sum(len(v) for v in records_by_type.values())} records, "
                       f"{len(workouts)} workouts, {len(set(records_by_type.keys()))} data types")

        return payloads


def _parse_apple_date(date_str: str) -> datetime | None:
    """Parse Apple Health date format: '2024-01-15 10:30:00 -0500'"""
    try:
        return datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S %z")
    except (ValueError, TypeError):
        return None
