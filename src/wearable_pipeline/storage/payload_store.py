"""JSONB payload storage with SHA-256 deduplication."""
from __future__ import annotations

import hashlib
import json
import logging
from datetime import datetime
from dataclasses import dataclass, field
from typing import Any

import asyncpg

logger = logging.getLogger(__name__)


@dataclass
class RawPayload:
    """A single raw data payload to store."""
    device_type: str
    data_category: str                          # 'sleep', 'heart_rate', 'activity', etc.
    payload: dict[str, Any]                     # complete raw data
    data_start_time: datetime | None = None
    data_end_time: datetime | None = None
    api_endpoint: str | None = None
    source_file_name: str | None = None
    ingestion_method: str = "api_pull"
    user_id: str = "default"


@dataclass
class IngestionResult:
    """Result of a batch ingestion."""
    total: int = 0
    inserted: int = 0
    duplicated: int = 0
    errors: int = 0
    error_messages: list[str] = field(default_factory=list)


def compute_content_hash(payload: dict) -> str:
    """SHA-256 of JSON-serialized payload for deduplication."""
    json_str = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(json_str.encode()).hexdigest()


def compute_file_hash(file_path: str) -> str:
    """SHA-256 of entire file."""
    sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            sha256.update(chunk)
    return sha256.hexdigest()


async def store_payloads(
    pool: asyncpg.Pool,
    payloads: list[RawPayload],
) -> IngestionResult:
    """Store a batch of raw payloads into raw_payloads table with dedup."""
    result = IngestionResult(total=len(payloads))

    async with pool.acquire() as conn:
        for p in payloads:
            content_hash = compute_content_hash(p.payload)
            try:
                row = await conn.fetchrow(
                    """
                    INSERT INTO raw_payloads
                        (user_id, device_type, data_category, payload, content_hash,
                         data_start_time, data_end_time, api_endpoint,
                         ingestion_method, source_file_name)
                    VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10)
                    ON CONFLICT (user_id, device_type, data_category, content_hash)
                    DO NOTHING
                    RETURNING id
                    """,
                    p.user_id,
                    p.device_type,
                    p.data_category,
                    json.dumps(p.payload, default=str),
                    content_hash,
                    p.data_start_time,
                    p.data_end_time,
                    p.api_endpoint,
                    p.ingestion_method,
                    p.source_file_name,
                )
                if row:
                    result.inserted += 1
                else:
                    result.duplicated += 1
            except Exception as e:
                result.errors += 1
                result.error_messages.append(str(e))
                logger.error(f"Error storing payload: {e}")

    return result


async def log_ingestion(
    pool: asyncpg.Pool,
    user_id: str,
    device_type: str,
    job_type: str,
    result: IngestionResult,
    error: str | None = None,
):
    """Log an ingestion job result."""
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO ingestion_logs
                (user_id, device_type, job_type, status,
                 records_total, records_new, records_duplicate,
                 error_message, completed_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            """,
            user_id,
            device_type,
            job_type,
            "error" if error else "success",
            result.total,
            result.inserted,
            result.duplicated,
            error or ("; ".join(result.error_messages) if result.error_messages else None),
        )
