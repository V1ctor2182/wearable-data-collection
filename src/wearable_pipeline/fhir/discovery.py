"""FHIR endpoint discovery — .well-known/smart-configuration + hospital directory."""
from __future__ import annotations

import json
import logging
from pathlib import Path
from datetime import datetime, timezone

import httpx
import asyncpg

logger = logging.getLogger(__name__)

# Curated hospital directory (loaded once)
_HOSPITAL_DIRECTORY: list[dict] | None = None
_DIRECTORY_PATH = Path(__file__).parent / "hospital_directory.json"


def _load_directory() -> list[dict]:
    global _HOSPITAL_DIRECTORY
    if _HOSPITAL_DIRECTORY is None:
        with open(_DIRECTORY_PATH) as f:
            _HOSPITAL_DIRECTORY = json.load(f)
    return _HOSPITAL_DIRECTORY


async def discover_smart_config(fhir_base_url: str) -> dict:
    """Fetch .well-known/smart-configuration from a FHIR server.

    Returns the parsed JSON with authorization_endpoint, token_endpoint, etc.
    """
    url = f"{fhir_base_url.rstrip('/')}/.well-known/smart-configuration"
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(url, headers={"Accept": "application/json"})
        resp.raise_for_status()
        return resp.json()


async def register_endpoint(
    pool: asyncpg.Pool,
    endpoint_id: str,
    display_name: str,
    fhir_base_url: str,
    ehr_vendor: str | None = None,
) -> dict:
    """Discover SMART config and upsert into fhir_endpoints table.

    Returns the endpoint row as a dict.
    """
    # Discover SMART configuration
    try:
        smart_config = await discover_smart_config(fhir_base_url)
    except Exception as e:
        logger.warning(f"SMART discovery failed for {fhir_base_url}: {e}")
        smart_config = {}

    authorize_url = smart_config.get("authorization_endpoint")
    token_url = smart_config.get("token_endpoint")

    if not authorize_url or not token_url:
        raise ValueError(
            f"SMART discovery did not return authorization/token endpoints for {fhir_base_url}. "
            f"Got: {list(smart_config.keys())}"
        )

    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO fhir_endpoints
                (id, display_name, fhir_base_url, ehr_vendor,
                 authorize_url, token_url, smart_config, last_discovery_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW())
            ON CONFLICT (id) DO UPDATE SET
                display_name = EXCLUDED.display_name,
                fhir_base_url = EXCLUDED.fhir_base_url,
                authorize_url = EXCLUDED.authorize_url,
                token_url = EXCLUDED.token_url,
                smart_config = EXCLUDED.smart_config,
                last_discovery_at = NOW()
            """,
            endpoint_id,
            display_name,
            fhir_base_url,
            ehr_vendor,
            authorize_url,
            token_url,
            json.dumps(smart_config),
        )

    logger.info(f"FHIR endpoint registered: {endpoint_id} ({display_name})")
    return {
        "id": endpoint_id,
        "display_name": display_name,
        "fhir_base_url": fhir_base_url,
        "ehr_vendor": ehr_vendor,
        "authorize_url": authorize_url,
        "token_url": token_url,
    }


async def get_endpoint(pool: asyncpg.Pool, endpoint_id: str) -> dict | None:
    """Fetch endpoint from DB. Returns None if not found."""
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM fhir_endpoints WHERE id = $1 AND is_active = true",
            endpoint_id,
        )
    return dict(row) if row else None


async def ensure_endpoint_registered(
    pool: asyncpg.Pool, endpoint_id: str
) -> dict:
    """Ensure endpoint is in DB — if not, look up from directory and register."""
    existing = await get_endpoint(pool, endpoint_id)
    if existing:
        return existing

    # Look up in curated directory
    directory = _load_directory()
    entry = next((h for h in directory if h["id"] == endpoint_id), None)
    if not entry:
        raise ValueError(
            f"Unknown FHIR endpoint: {endpoint_id}. "
            f"Not found in database or hospital directory."
        )

    return await register_endpoint(
        pool,
        endpoint_id=entry["id"],
        display_name=entry["name"],
        fhir_base_url=entry["fhir_base_url"],
        ehr_vendor=entry.get("vendor"),
    )


def search_hospitals(query: str) -> list[dict]:
    """Search the curated hospital directory by name (case-insensitive)."""
    directory = _load_directory()
    q = query.lower()
    return [
        h for h in directory
        if q in h["name"].lower() or q in h["id"] or q in h.get("vendor", "")
    ]


async def list_connected_hospitals(
    pool: asyncpg.Pool, user_id: str = "default"
) -> list[dict]:
    """List all hospitals a user has connected."""
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT c.endpoint_id, c.fhir_patient_id, c.status,
                   c.last_sync_at, c.last_error, c.connected_at,
                   e.display_name, e.fhir_base_url, e.ehr_vendor
            FROM fhir_user_connections c
            JOIN fhir_endpoints e ON e.id = c.endpoint_id
            WHERE c.user_id = $1
            ORDER BY c.connected_at DESC
            """,
            user_id,
        )
    return [dict(r) for r in rows]


async def ensure_fhir_device_registered(
    pool: asyncpg.Pool, endpoint_id: str, display_name: str
):
    """Ensure a devices row exists for fhir:{endpoint_id} (satisfies FK constraint)."""
    device_type = f"fhir:{endpoint_id}"
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO devices (device_type, ingestion_method, display_name)
            VALUES ($1, 'fhir', $2)
            ON CONFLICT (device_type) DO NOTHING
            """,
            device_type,
            f"FHIR — {display_name}",
        )
