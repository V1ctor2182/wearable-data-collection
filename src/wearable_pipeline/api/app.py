"""FastAPI application — OAuth, file upload, webhook, and query endpoints."""
from __future__ import annotations

import json
import os
import shutil
import logging
import tempfile
from datetime import date, datetime, timezone
from pathlib import Path
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, UploadFile, File, Query, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from ..config import settings
from ..db.connection import get_pool, close_pool, init_schema
from ..oauth.manager import (
    init_oauth_configs, generate_auth_url, handle_callback, get_valid_token, OAUTH_CONFIGS
)
from ..storage.payload_store import (
    store_payloads, log_ingestion, compute_file_hash, IngestionResult
)
from ..collectors.fitbit import FitbitCollector
from ..collectors.oura import OuraCollector
from ..collectors.whoop import WhoopCollector
from ..collectors.google_fit import GoogleFitCollector
from ..collectors.apple_health import AppleHealthCollector
from ..collectors.garmin import GarminCollector
from ..collectors.samsung import SamsungCollector
from ..collectors.health_connect import HealthConnectCollector
from ..collectors.xiaomi import XiaomiCollector
from ..collectors.polar_suunto import PolarSuuntoCollector
# from ..collectors.terra import TerraCollector  # Terra disabled

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# Collector registry
FILE_COLLECTORS = {
    "apple_health": AppleHealthCollector,
    "garmin": GarminCollector,
    "samsung": SamsungCollector,
    "health_connect": HealthConnectCollector,
    "xiaomi": XiaomiCollector,
    "polar_suunto": PolarSuuntoCollector,
}

OAUTH_COLLECTORS = {
    "fitbit": FitbitCollector,
    "oura": OuraCollector,
    "whoop": WhoopCollector,
    "google_fit": GoogleFitCollector,
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown."""
    init_oauth_configs()
    pool = await get_pool()
    await init_schema()
    os.makedirs(settings.upload_temp_dir, exist_ok=True)
    logger.info("Wearable Data Pipeline started")
    yield
    await close_pool()
    logger.info("Shutdown complete")


app = FastAPI(
    title="Wearable Data Pipeline",
    version="0.1.0",
    description="Raw data collection for 11 wearable devices",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Health Check ───────────────────────────────────────────
@app.get("/")
async def health():
    pool = await get_pool()
    count = await pool.fetchval("SELECT COUNT(*) FROM raw_payloads")
    devices = await pool.fetch("SELECT device_type, ingestion_method FROM devices ORDER BY device_type")
    return {
        "status": "ok",
        "total_payloads": count,
        "devices": [dict(d) for d in devices],
    }


# ─── OAuth Endpoints ────────────────────────────────────────
# Support both /oauth/... and /api/v1/oauth/... (to match redirect URIs registered with providers)
@app.get("/oauth/{device_type}/authorize")
@app.get("/api/v1/oauth/{device_type}/authorize")
async def oauth_authorize(device_type: str, user_id: str = "default"):
    """Start OAuth flow → redirect to device auth page."""
    try:
        url = generate_auth_url(device_type, user_id)
        return {"authorization_url": url}
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.get("/oauth/{device_type}/callback")
@app.get("/api/v1/oauth/{device_type}/callback")
async def oauth_callback(device_type: str, code: str, state: str):
    """Handle OAuth callback, store tokens."""
    pool = await get_pool()
    try:
        result = await handle_callback(pool, state, code)
        return {"success": True, **result}
    except Exception as e:
        logger.error(f"OAuth callback error: {e}")
        raise HTTPException(400, str(e))


@app.get("/oauth/status")
async def oauth_status(user_id: str = "default"):
    """Check which devices have valid tokens."""
    pool = await get_pool()
    rows = await pool.fetch(
        "SELECT device_type, expires_at, updated_at FROM oauth_tokens WHERE user_id = $1",
        user_id,
    )
    result = {}
    now = datetime.now(timezone.utc)
    for r in rows:
        expired = r["expires_at"] and r["expires_at"] < now
        result[r["device_type"]] = {
            "connected": True,
            "expired": expired,
            "updated_at": r["updated_at"].isoformat() if r["updated_at"] else None,
        }
    return result


# ─── Manual Sync (OAuth devices) ───────────────────────────
@app.post("/sync/{device_type}")
async def manual_sync(
    device_type: str,
    user_id: str = "default",
    days_back: int = Query(default=1, ge=1, le=365),
    target_date: Optional[str] = None,
):
    """Manually trigger data pull for an OAuth device."""
    if device_type not in OAUTH_COLLECTORS:
        raise HTTPException(400, f"Not an OAuth device: {device_type}. Use /upload for file devices.")

    pool = await get_pool()
    collector_cls = OAUTH_COLLECTORS[device_type]
    collector = collector_cls(pool, user_id)

    td = date.fromisoformat(target_date) if target_date else None

    try:
        raw_payloads = await collector.collect(target_date=td, days_back=days_back)
        result = await store_payloads(pool, raw_payloads)
        await log_ingestion(pool, user_id, device_type, "manual", result)
        return {
            "device": device_type,
            "total": result.total,
            "inserted": result.inserted,
            "duplicated": result.duplicated,
            "errors": result.errors,
        }
    except Exception as e:
        logger.error(f"Sync error for {device_type}: {e}")
        await log_ingestion(pool, user_id, device_type, "manual", IngestionResult(), error=str(e))
        raise HTTPException(500, str(e))


# ─── File Upload ────────────────────────────────────────────
@app.post("/upload/{device_type}")
async def upload_file(
    device_type: str,
    file: UploadFile = File(...),
    user_id: str = "default",
):
    """Upload a file for file-based devices."""
    if device_type not in FILE_COLLECTORS:
        raise HTTPException(400, f"Not a file device: {device_type}. Use /sync for OAuth devices.")

    pool = await get_pool()

    # Save to temp
    tmp_path = os.path.join(settings.upload_temp_dir, file.filename or "upload")
    with open(tmp_path, "wb") as f:
        content = await file.read()
        f.write(content)

    # Check file dedup
    file_hash = compute_file_hash(tmp_path)
    existing = await pool.fetchrow(
        "SELECT id FROM file_uploads WHERE user_id=$1 AND device_type=$2 AND file_hash=$3",
        user_id, device_type, file_hash,
    )
    if existing:
        os.remove(tmp_path)
        return {"status": "duplicate", "message": "File already processed"}

    # Record upload
    upload_id = await pool.fetchval(
        """
        INSERT INTO file_uploads (user_id, device_type, file_name, file_hash, file_size_bytes, status)
        VALUES ($1, $2, $3, $4, $5, 'processing') RETURNING id
        """,
        user_id, device_type, file.filename, file_hash, len(content),
    )

    try:
        collector = FILE_COLLECTORS[device_type]()
        raw_payloads = await collector.collect(file_path=tmp_path, user_id=user_id)
        result = await store_payloads(pool, raw_payloads)

        await pool.execute(
            "UPDATE file_uploads SET status='done', records_inserted=$1, records_duplicated=$2, processed_at=NOW() WHERE id=$3",
            result.inserted, result.duplicated, upload_id,
        )
        await log_ingestion(pool, user_id, device_type, "file_upload", result)

        return {
            "device": device_type,
            "file": file.filename,
            "total": result.total,
            "inserted": result.inserted,
            "duplicated": result.duplicated,
        }
    except Exception as e:
        await pool.execute(
            "UPDATE file_uploads SET status='error', error_message=$1 WHERE id=$2",
            str(e), upload_id,
        )
        logger.error(f"Upload error for {device_type}: {e}")
        raise HTTPException(500, str(e))
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


# # ─── Terra Webhook (disabled) ──────────────────────────────
# @app.post("/webhook/terra")
# async def terra_webhook(request: Request):
#     """Receive Terra webhook data."""
#     pool = await get_pool()
#     payload = await request.json()
#     collector = TerraCollector()
#     user_id = payload.get("user", {}).get("user_id", "terra_default")
#     raw_payloads = await collector.collect(webhook_payload=payload, user_id=user_id)
#     result = await store_payloads(pool, raw_payloads)
#     await log_ingestion(pool, user_id, "terra", "webhook", result)
#     return {"status": "ok", "inserted": result.inserted}


# ─── Query API (for Dashboard) ──────────────────────────────
@app.get("/api/payloads")
async def list_payloads(
    user_id: str = "default",
    device_type: Optional[str] = None,
    data_category: Optional[str] = None,
    limit: int = Query(default=50, le=500),
    offset: int = 0,
):
    """List raw payloads with filters."""
    pool = await get_pool()
    conditions = ["user_id = $1"]
    params: list = [user_id]
    idx = 2

    if device_type:
        conditions.append(f"device_type = ${idx}")
        params.append(device_type)
        idx += 1
    if data_category:
        conditions.append(f"data_category = ${idx}")
        params.append(data_category)
        idx += 1

    where = " AND ".join(conditions)
    rows = await pool.fetch(
        f"""
        SELECT id, device_type, data_category,
               payload, content_hash,
               data_start_time, data_end_time,
               api_endpoint, ingestion_method, source_file_name,
               ingested_at
        FROM raw_payloads
        WHERE {where}
        ORDER BY ingested_at DESC
        LIMIT ${idx} OFFSET ${idx + 1}
        """,
        *params, limit, offset,
    )

    total = await pool.fetchval(
        f"SELECT COUNT(*) FROM raw_payloads WHERE {where}",
        *params,
    )

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "data": [
            {
                "id": r["id"],
                "device_type": r["device_type"],
                "data_category": r["data_category"],
                "payload": json.loads(r["payload"]) if isinstance(r["payload"], str) else r["payload"],
                "content_hash": r["content_hash"],
                "data_start_time": r["data_start_time"].isoformat() if r["data_start_time"] else None,
                "data_end_time": r["data_end_time"].isoformat() if r["data_end_time"] else None,
                "api_endpoint": r["api_endpoint"],
                "ingestion_method": r["ingestion_method"],
                "source_file_name": r["source_file_name"],
                "ingested_at": r["ingested_at"].isoformat() if r["ingested_at"] else None,
            }
            for r in rows
        ],
    }


@app.get("/api/stats")
async def get_stats(user_id: str = "default"):
    """Get summary stats for the dashboard."""
    pool = await get_pool()

    # Per-device counts
    device_stats = await pool.fetch(
        """
        SELECT device_type, data_category, COUNT(*) as count,
               MIN(ingested_at) as first_ingested, MAX(ingested_at) as last_ingested
        FROM raw_payloads WHERE user_id = $1
        GROUP BY device_type, data_category
        ORDER BY device_type, data_category
        """,
        user_id,
    )

    # Total counts
    total = await pool.fetchval("SELECT COUNT(*) FROM raw_payloads WHERE user_id = $1", user_id)

    # Ingestion logs
    recent_logs = await pool.fetch(
        """
        SELECT device_type, job_type, status, records_new, records_duplicate,
               error_message, started_at, completed_at
        FROM ingestion_logs WHERE user_id = $1
        ORDER BY started_at DESC LIMIT 20
        """,
        user_id,
    )

    # File uploads
    uploads = await pool.fetch(
        """
        SELECT device_type, file_name, status, records_inserted, records_duplicated,
               file_size_bytes, uploaded_at
        FROM file_uploads WHERE user_id = $1
        ORDER BY uploaded_at DESC LIMIT 20
        """,
        user_id,
    )

    # OAuth status
    tokens = await pool.fetch(
        "SELECT device_type, expires_at, updated_at FROM oauth_tokens WHERE user_id = $1",
        user_id,
    )

    return {
        "total_payloads": total,
        "device_stats": [
            {
                "device_type": r["device_type"],
                "data_category": r["data_category"],
                "count": r["count"],
                "first_ingested": r["first_ingested"].isoformat() if r["first_ingested"] else None,
                "last_ingested": r["last_ingested"].isoformat() if r["last_ingested"] else None,
            }
            for r in device_stats
        ],
        "recent_logs": [dict(r) for r in recent_logs],
        "recent_uploads": [dict(r) for r in uploads],
        "oauth_tokens": [
            {
                "device_type": r["device_type"],
                "expires_at": r["expires_at"].isoformat() if r["expires_at"] else None,
                "updated_at": r["updated_at"].isoformat() if r["updated_at"] else None,
            }
            for r in tokens
        ],
    }


@app.get("/api/payload/{payload_id}")
async def get_payload(payload_id: int):
    """Get a single payload by ID (full JSONB)."""
    pool = await get_pool()
    row = await pool.fetchrow("SELECT * FROM raw_payloads WHERE id = $1", payload_id)
    if not row:
        raise HTTPException(404, "Payload not found")
    return {
        "id": row["id"],
        "device_type": row["device_type"],
        "data_category": row["data_category"],
        "payload": json.loads(row["payload"]) if isinstance(row["payload"], str) else row["payload"],
        "content_hash": row["content_hash"],
        "ingested_at": row["ingested_at"].isoformat() if row["ingested_at"] else None,
    }


@app.get("/api/categories")
async def list_categories(user_id: str = "default"):
    """List all unique device_type + data_category combinations."""
    pool = await get_pool()
    rows = await pool.fetch(
        """
        SELECT device_type, data_category, COUNT(*) as count
        FROM raw_payloads WHERE user_id = $1
        GROUP BY device_type, data_category
        ORDER BY device_type, data_category
        """,
        user_id,
    )
    return [dict(r) for r in rows]
