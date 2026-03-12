"""APScheduler jobs for automated data collection."""
from __future__ import annotations

import logging
from datetime import date, timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from ..db.connection import get_pool
from ..oauth.manager import get_valid_token, OAUTH_CONFIGS
from ..storage.payload_store import store_payloads, log_ingestion, IngestionResult
from ..collectors.fitbit import FitbitCollector
from ..collectors.oura import OuraCollector
from ..collectors.whoop import WhoopCollector
from ..collectors.google_fit import GoogleFitCollector
# from ..collectors.terra import TerraCollector  # Terra disabled

logger = logging.getLogger(__name__)

OAUTH_COLLECTOR_MAP = {
    "fitbit": FitbitCollector,
    "oura": OuraCollector,
    "whoop": WhoopCollector,
    "google_fit": GoogleFitCollector,
}

scheduler = AsyncIOScheduler()


async def sync_device(device_type: str, user_id: str = "default", days_back: int = 1):
    """Pull data from an OAuth device and store it."""
    pool = await get_pool()
    collector_cls = OAUTH_COLLECTOR_MAP.get(device_type)
    if not collector_cls:
        logger.warning(f"No OAuth collector for {device_type}")
        return

    try:
        collector = collector_cls(pool, user_id)
        target = date.today() - timedelta(days=days_back - 1)
        raw_payloads = await collector.collect(target_date=target, days_back=days_back)
        result = await store_payloads(pool, raw_payloads)
        await log_ingestion(pool, user_id, device_type, "cron", result)
        logger.info(
            f"[cron] {device_type}: {result.inserted} new, "
            f"{result.duplicated} dup, {result.errors} err"
        )
    except Exception as e:
        logger.error(f"[cron] {device_type} sync failed: {e}")
        await log_ingestion(
            pool, user_id, device_type, "cron", IngestionResult(), error=str(e)
        )


async def sync_all_oauth(user_id: str = "default", days_back: int = 1):
    """Sync all OAuth devices that have valid tokens."""
    pool = await get_pool()

    for device_type in OAUTH_COLLECTOR_MAP:
        # Check if we have a token for this device
        row = await pool.fetchrow(
            "SELECT id FROM oauth_tokens WHERE user_id=$1 AND device_type=$2",
            user_id, device_type,
        )
        if row:
            await sync_device(device_type, user_id, days_back)
        else:
            logger.debug(f"[cron] Skipping {device_type} — no token for {user_id}")


def setup_scheduler(
    hour: int = 3,
    minute: int = 0,
    user_id: str = "default",
    days_back: int = 1,
):
    """Configure default cron jobs. Runs daily at the specified time (UTC)."""
    scheduler.add_job(
        sync_all_oauth,
        CronTrigger(hour=hour, minute=minute),
        kwargs={"user_id": user_id, "days_back": days_back},
        id="daily_sync_all",
        replace_existing=True,
        name="Daily sync all OAuth devices",
    )
    logger.info(f"Scheduled daily_sync_all at {hour:02d}:{minute:02d} UTC")


def start_scheduler():
    """Start the APScheduler if not already running."""
    if not scheduler.running:
        scheduler.start()
        logger.info("Scheduler started")


def stop_scheduler():
    """Gracefully shut down the scheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")
