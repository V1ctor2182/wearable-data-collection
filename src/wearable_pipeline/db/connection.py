"""PostgreSQL connection pool using asyncpg."""
from __future__ import annotations

import os
import ssl
from typing import Optional
import asyncpg
import logging
from pathlib import Path
from ..config import settings

logger = logging.getLogger(__name__)

_pool: asyncpg.Pool | None = None


async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        # Use SSL on Railway (internal connections don't need it, but public ones do)
        ssl_ctx = None
        if os.environ.get("RAILWAY_ENVIRONMENT"):
            ssl_ctx = ssl.create_default_context()
            ssl_ctx.check_hostname = False
            ssl_ctx.verify_mode = ssl.CERT_NONE

        _pool = await asyncpg.create_pool(
            host=settings.db_host,
            port=settings.db_port,
            database=settings.db_name,
            user=settings.db_user,
            password=settings.db_password or None,
            min_size=2,
            max_size=20,
            command_timeout=30,
            ssl=ssl_ctx,
        )
        logger.info(f"Connected to PostgreSQL: {settings.db_name}@{settings.db_host}")
    return _pool


async def close_pool():
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
        logger.info("PostgreSQL connection pool closed")


async def init_schema():
    """Run schema.sql to create tables."""
    pool = await get_pool()
    schema_path = Path(__file__).parent / "schema.sql"
    sql = schema_path.read_text()
    async with pool.acquire() as conn:
        await conn.execute(sql)
    logger.info("Database schema initialized")
