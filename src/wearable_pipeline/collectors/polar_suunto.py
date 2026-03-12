"""Polar/Suunto file collector — parses TCX/CSV/GPX → JSONB with ALL fields."""
from __future__ import annotations

import csv
import io
import logging
from pathlib import Path
from xml.etree import ElementTree as ET

from .base import BaseCollector
from ..storage.payload_store import RawPayload

logger = logging.getLogger(__name__)

TCX_NS = {
    "tcx": "http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2",
    "ext": "http://www.garmin.com/xmlschemas/ActivityExtension/v2",
}


class PolarSuuntoCollector(BaseCollector):
    device_type = "polar_suunto"

    async def collect(self, file_path: str, user_id: str = "default", **kwargs) -> list[RawPayload]:
        payloads: list[RawPayload] = []
        path = Path(file_path)
        ext = path.suffix.lower()

        if ext == ".tcx":
            payloads.extend(await self._parse_tcx(file_path, user_id))
        elif ext == ".csv":
            payloads.extend(await self._parse_csv(file_path, user_id))
        elif ext == ".gpx":
            payloads.extend(await self._parse_gpx(file_path, user_id))
        else:
            logger.warning(f"Unsupported Polar/Suunto file type: {ext}")

        return payloads

    async def _parse_tcx(self, file_path: str, user_id: str) -> list[RawPayload]:
        """Parse TCX XML including ALL laps and ALL trackpoints."""
        payloads: list[RawPayload] = []
        tree = ET.parse(file_path)
        root = tree.getroot()

        for activity in root.findall(".//tcx:Activity", TCX_NS):
            sport = activity.get("Sport", "Unknown")
            activity_data = {"sport": sport, "laps": []}

            for lap in activity.findall("tcx:Lap", TCX_NS):
                lap_data = dict(lap.attrib)
                # Extract all lap-level fields
                for child in lap:
                    tag = child.tag.split("}")[-1] if "}" in child.tag else child.tag
                    if tag == "Track":
                        # Parse ALL trackpoints
                        trackpoints = []
                        for tp in child.findall("tcx:Trackpoint", TCX_NS):
                            tp_data = _element_to_dict(tp)
                            trackpoints.append(tp_data)
                        lap_data["trackpoints"] = trackpoints
                        lap_data["trackpoint_count"] = len(trackpoints)
                    elif child.text and child.text.strip():
                        lap_data[tag] = child.text.strip()
                    else:
                        lap_data[tag] = _element_to_dict(child)

                activity_data["laps"].append(lap_data)

            payloads.append(RawPayload(
                device_type=self.device_type,
                data_category="tcx_activity",
                payload=activity_data,
                ingestion_method="file_upload",
                source_file_name=Path(file_path).name,
                user_id=user_id,
            ))
            total_tp = sum(l.get("trackpoint_count", 0) for l in activity_data["laps"])
            logger.info(f"Polar/Suunto TCX {sport}: {len(activity_data['laps'])} laps, {total_tp} trackpoints")

        return payloads

    async def _parse_csv(self, file_path: str, user_id: str) -> list[RawPayload]:
        """Parse CSV export (Polar Flow HR/speed/cadence data)."""
        content = Path(file_path).read_text(encoding="utf-8", errors="replace")
        reader = csv.DictReader(io.StringIO(content))
        records = list(reader)

        if not records:
            return []

        return [RawPayload(
            device_type=self.device_type,
            data_category="csv_data",
            payload={
                "file_name": Path(file_path).name,
                "headers": list(records[0].keys()),
                "records": records,
                "count": len(records),
            },
            ingestion_method="file_upload",
            source_file_name=Path(file_path).name,
            user_id=user_id,
        )]

    async def _parse_gpx(self, file_path: str, user_id: str) -> list[RawPayload]:
        """Parse GPX file (GPS route data)."""
        tree = ET.parse(file_path)
        root = tree.getroot()
        # Remove namespace for easier parsing
        ns = {"gpx": "http://www.topografix.com/GPX/1/1"}

        tracks = []
        for trk in root.findall(".//gpx:trk", ns):
            track = {"name": "", "segments": []}
            name_el = trk.find("gpx:name", ns)
            if name_el is not None and name_el.text:
                track["name"] = name_el.text
            for seg in trk.findall("gpx:trkseg", ns):
                points = []
                for pt in seg.findall("gpx:trkpt", ns):
                    point = {"lat": pt.get("lat"), "lon": pt.get("lon")}
                    for child in pt:
                        tag = child.tag.split("}")[-1]
                        point[tag] = child.text
                    points.append(point)
                track["segments"].append({"points": points, "count": len(points)})
            tracks.append(track)

        if not tracks:
            return []

        return [RawPayload(
            device_type=self.device_type,
            data_category="gpx_route",
            payload={"tracks": tracks},
            ingestion_method="file_upload",
            source_file_name=Path(file_path).name,
            user_id=user_id,
        )]


def _element_to_dict(elem) -> dict:
    """Recursively convert XML element to dict, preserving ALL data."""
    result = dict(elem.attrib)
    for child in elem:
        tag = child.tag.split("}")[-1] if "}" in child.tag else child.tag
        if len(child) > 0:
            result[tag] = _element_to_dict(child)
        elif child.text and child.text.strip():
            result[tag] = child.text.strip()
    if elem.text and elem.text.strip() and not result:
        return elem.text.strip()
    return result
