"""FHIR R4 collector — fetches clinical data from hospital EHR via SMART on FHIR."""
from __future__ import annotations

import logging
from datetime import datetime, timezone

import httpx
import asyncpg

from .base import BaseCollector
from ..storage.payload_store import RawPayload
from ..oauth.manager import get_valid_fhir_token

logger = logging.getLogger(__name__)

# (data_category, url_template, is_search_bundle)
# url_template uses {patient_id} placeholder
FHIR_RESOURCE_QUERIES = [
    # ─── Core clinical data (USCDI required) ───
    ("Patient",                "Patient/{patient_id}",                                      False),
    ("Observation_lab",        "Observation?patient={patient_id}&category=laboratory",       True),
    ("Observation_vital",      "Observation?patient={patient_id}&category=vital-signs",      True),
    ("Observation_social",     "Observation?patient={patient_id}&category=social-history",   True),
    ("Condition",              "Condition?patient={patient_id}",                              True),
    ("MedicationRequest",      "MedicationRequest?patient={patient_id}",                     True),
    ("Procedure",              "Procedure?patient={patient_id}",                             True),
    ("Immunization",           "Immunization?patient={patient_id}",                          True),
    ("AllergyIntolerance",     "AllergyIntolerance?patient={patient_id}",                    True),
    ("DocumentReference",      "DocumentReference?patient={patient_id}",                     True),
    # ─── Extended clinical data ───
    ("Encounter",              "Encounter?patient={patient_id}",                             True),
    ("CarePlan",               "CarePlan?patient={patient_id}",                              True),
    ("CareTeam",               "CareTeam?patient={patient_id}",                              True),
    ("Goal",                   "Goal?patient={patient_id}",                                  True),
    ("DiagnosticReport",       "DiagnosticReport?patient={patient_id}",                      True),
    ("Device",                 "Device?patient={patient_id}",                                True),
    ("MedicationStatement",    "MedicationStatement?patient={patient_id}",                   True),
    ("FamilyMemberHistory",    "FamilyMemberHistory?patient={patient_id}",                   True),
    ("RelatedPerson",          "RelatedPerson?patient={patient_id}",                         True),
    ("Coverage",               "Coverage?patient={patient_id}",                              True),
    ("Provenance",             "Provenance?patient={patient_id}",                            True),
]

# Max pages per resource type to prevent runaway pagination
MAX_PAGES = 50


class FHIRCollector(BaseCollector):
    """Collects clinical data from a single hospital FHIR server."""

    def __init__(self, pool: asyncpg.Pool, user_id: str, endpoint_id: str):
        self.pool = pool
        self.user_id = user_id
        self.endpoint_id = endpoint_id
        self.device_type = f"fhir:{endpoint_id}"

    async def collect(self, **kwargs) -> list[RawPayload]:
        """Fetch all FHIR resources for the connected patient."""
        from ..fhir.discovery import get_endpoint

        # Get token + endpoint info
        token = await get_valid_fhir_token(self.pool, self.endpoint_id, self.user_id)

        endpoint = await get_endpoint(self.pool, self.endpoint_id)
        if not endpoint:
            raise ValueError(f"FHIR endpoint not found: {self.endpoint_id}")

        fhir_base = endpoint["fhir_base_url"].rstrip("/")

        # Get patient ID from connection record
        patient_id = await self._get_patient_id()

        payloads: list[RawPayload] = []

        async with httpx.AsyncClient(
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/fhir+json, application/json",
            },
            timeout=30.0,
        ) as client:
            for category, url_template, is_bundle in FHIR_RESOURCE_QUERIES:
                try:
                    url = f"{fhir_base}/{url_template.format(patient_id=patient_id)}"

                    if is_bundle:
                        page_payloads = await self._fetch_bundle(
                            client, url, category, fhir_base
                        )
                        payloads.extend(page_payloads)
                    else:
                        # Single resource (e.g., Patient)
                        resp = await client.get(url)
                        if resp.status_code == 200:
                            data = resp.json()
                            payloads.append(RawPayload(
                                device_type=self.device_type,
                                data_category=category,
                                payload=data,
                                api_endpoint=url_template,
                                ingestion_method="fhir_pull",
                                user_id=self.user_id,
                            ))
                            logger.info(f"FHIR {category}: OK (single resource)")
                        else:
                            logger.warning(f"FHIR {category}: HTTP {resp.status_code}")

                except Exception as e:
                    logger.error(f"FHIR {category} error for {self.endpoint_id}: {e}")

        # Update last_sync_at
        async with self.pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE fhir_user_connections
                SET last_sync_at = NOW(), last_error = NULL
                WHERE user_id = $1 AND endpoint_id = $2
                """,
                self.user_id, self.endpoint_id,
            )

        logger.info(
            f"FHIR {self.endpoint_id}: collected {len(payloads)} payloads "
            f"for patient {patient_id}"
        )
        return payloads

    async def _fetch_bundle(
        self,
        client: httpx.AsyncClient,
        url: str,
        category: str,
        fhir_base: str,
    ) -> list[RawPayload]:
        """Fetch a FHIR Bundle with pagination (follows 'next' links)."""
        payloads: list[RawPayload] = []
        page = 0

        while url and page < MAX_PAGES:
            resp = await client.get(url)

            if resp.status_code != 200:
                if page == 0:
                    logger.warning(f"FHIR {category}: HTTP {resp.status_code}")
                break

            bundle = resp.json()
            entries = bundle.get("entry", [])
            total = bundle.get("total")

            if entries:
                payloads.append(RawPayload(
                    device_type=self.device_type,
                    data_category=category,
                    payload=bundle,
                    api_endpoint=f"{category}?page={page}",
                    ingestion_method="fhir_pull",
                    user_id=self.user_id,
                ))

            entry_count = len(entries)
            total_str = f"/{total}" if total is not None else ""
            logger.info(f"FHIR {category} page {page}: {entry_count} entries{total_str}")

            # Find next page link
            url = None
            for link in bundle.get("link", []):
                if link.get("relation") == "next":
                    url = link["url"]
                    break

            page += 1

        return payloads

    async def _get_patient_id(self) -> str:
        """Get the FHIR patient ID from the user connection record."""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT fhir_patient_id FROM fhir_user_connections WHERE user_id = $1 AND endpoint_id = $2",
                self.user_id, self.endpoint_id,
            )

        if not row or not row["fhir_patient_id"]:
            raise ValueError(
                f"No patient ID for {self.endpoint_id} (user={self.user_id}). "
                f"Re-connect the hospital."
            )

        return row["fhir_patient_id"]
