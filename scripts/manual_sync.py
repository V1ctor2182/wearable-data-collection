#!/usr/bin/env python3
"""Manually sync data from an OAuth device.

Usage:
    python scripts/manual_sync.py fitbit
    python scripts/manual_sync.py oura --days 7
    python scripts/manual_sync.py whoop --date 2024-01-15
"""

import argparse
import asyncio
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from wearable_pipeline.db.connection import get_pool, close_pool, init_schema
from wearable_pipeline.oauth.manager import init_oauth_configs
from wearable_pipeline.storage.payload_store import store_payloads, log_ingestion
from wearable_pipeline.collectors.fitbit import FitbitCollector
from wearable_pipeline.collectors.oura import OuraCollector
from wearable_pipeline.collectors.whoop import WhoopCollector
from wearable_pipeline.collectors.google_fit import GoogleFitCollector

COLLECTORS = {
    "fitbit": FitbitCollector,
    "oura": OuraCollector,
    "whoop": WhoopCollector,
    "google_fit": GoogleFitCollector,
}


async def main():
    parser = argparse.ArgumentParser(description="Manual sync for OAuth devices")
    parser.add_argument("device", choices=list(COLLECTORS.keys()))
    parser.add_argument("--user", default="default")
    parser.add_argument("--days", type=int, default=1)
    parser.add_argument("--date", type=str, default=None, help="Target date YYYY-MM-DD")
    args = parser.parse_args()

    init_oauth_configs()
    pool = await get_pool()
    await init_schema()

    collector_cls = COLLECTORS[args.device]
    collector = collector_cls(pool, args.user)

    td = date.fromisoformat(args.date) if args.date else None
    print(f"Syncing {args.device} (user={args.user}, days_back={args.days}, date={td})...")

    raw_payloads = await collector.collect(target_date=td, days_back=args.days)
    print(f"Collected {len(raw_payloads)} payloads")

    result = await store_payloads(pool, raw_payloads)
    await log_ingestion(pool, args.user, args.device, "manual", result)

    print(f"Result: {result.inserted} inserted, {result.duplicated} duplicated, {result.errors} errors")
    if result.error_messages:
        for msg in result.error_messages:
            print(f"  ERROR: {msg}")

    await close_pool()


if __name__ == "__main__":
    asyncio.run(main())
