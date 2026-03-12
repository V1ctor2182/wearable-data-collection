#!/usr/bin/env python3
"""Initialize the database: create tables, seed devices."""

import asyncio
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from wearable_pipeline.db.connection import get_pool, close_pool, init_schema


async def main():
    print("Connecting to PostgreSQL...")
    pool = await get_pool()
    print("Running schema...")
    await init_schema()

    count = await pool.fetchval("SELECT COUNT(*) FROM devices")
    print(f"Done! {count} devices registered.")

    devices = await pool.fetch("SELECT device_type, ingestion_method FROM devices ORDER BY device_type")
    for d in devices:
        print(f"  - {d['device_type']:20s} ({d['ingestion_method']})")

    await close_pool()
    print("Database initialized successfully.")


if __name__ == "__main__":
    asyncio.run(main())
