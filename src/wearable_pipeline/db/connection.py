"""PostgreSQL connection pool using asyncpg."""
from __future__ import annotations

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
        _pool = await asyncpg.create_pool(
            host=settings.db_host,
            port=settings.db_port,
            database=settings.db_name,
            user=settings.db_user,
            password=settings.db_password or None,
            min_size=2,
            max_size=20,
            command_timeout=30,
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
