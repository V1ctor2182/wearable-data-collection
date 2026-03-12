"""Base collector class for all device collectors."""
from __future__ import annotations

from abc import ABC, abstractmethod
from ..storage.payload_store import RawPayload


class BaseCollector(ABC):
    """Every collector converts device data → list[RawPayload]."""

    device_type: str

    @abstractmethod
    async def collect(self, **kwargs) -> list[RawPayload]:
        """Collect data from device and return raw payloads."""
        ...
