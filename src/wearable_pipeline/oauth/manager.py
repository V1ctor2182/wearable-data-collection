"""OAuth 2.0 flow management for wearable device APIs + SMART on FHIR."""
from __future__ import annotations

import json
import secrets
import logging
from base64 import b64encode
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass
from urllib.parse import urlencode

import httpx
import asyncpg

from ..config import settings

logger = logging.getLogger(__name__)


@dataclass
class OAuthDeviceConfig:
    device_type: str
    client_id: str
    client_secret: str
    authorize_url: str
    token_url: str
    scopes: list[str]
    api_base_url: str
    redirect_uri: str
    # Some providers use Basic auth for token exchange
    use_basic_auth: bool = False


# OAuth configs for each provider
OAUTH_CONFIGS: dict[str, OAuthDeviceConfig] = {}


def init_oauth_configs():
    """Initialize OAuth configs from settings."""
    global OAUTH_CONFIGS
    OAUTH_CONFIGS = {
        "fitbit": OAuthDeviceConfig(
            device_type="fitbit",
            client_id=settings.fitbit_client_id,
            client_secret=settings.fitbit_client_secret,
            authorize_url="https://www.fitbit.com/oauth2/authorize",
            token_url="https://api.fitbit.com/oauth2/token",
            scopes=["activity", "heartrate", "sleep", "profile", "weight",
                     "oxygen_saturation", "respiratory_rate", "temperature",
                     "cardio_fitness", "electrocardiogram", "nutrition", "location"],
            api_base_url="https://api.fitbit.com",
            redirect_uri=settings.fitbit_redirect_uri,
            use_basic_auth=True,
        ),
        "oura": OAuthDeviceConfig(
            device_type="oura",
            client_id=settings.oura_client_id,
            client_secret=settings.oura_client_secret,
            authorize_url="https://cloud.ouraring.com/oauth/authorize",
            token_url="https://api.ouraring.com/oauth/token",
            scopes=["daily", "heartrate", "personal", "session", "spo2", "workout", "tag"],
            api_base_url="https://api.ouraring.com",
            redirect_uri=settings.oura_redirect_uri,
        ),
        "google_fit": OAuthDeviceConfig(
            device_type="google_fit",
            client_id=settings.google_fit_client_id,
            client_secret=settings.google_fit_client_secret,
            authorize_url="https://accounts.google.com/o/oauth2/v2/auth",
            token_url="https://oauth2.googleapis.com/token",
            scopes=[
                "https://www.googleapis.com/auth/fitness.activity.read",
                "https://www.googleapis.com/auth/fitness.heart_rate.read",
                "https://www.googleapis.com/auth/fitness.sleep.read",
                "https://www.googleapis.com/auth/fitness.body.read",
                "https://www.googleapis.com/auth/fitness.blood_pressure.read",
                "https://www.googleapis.com/auth/fitness.blood_glucose.read",
                "https://www.googleapis.com/auth/fitness.oxygen_saturation.read",
                "https://www.googleapis.com/auth/fitness.body_temperature.read",
                "https://www.googleapis.com/auth/fitness.nutrition.read",
                "https://www.googleapis.com/auth/fitness.location.read",
            ],
            api_base_url="https://www.googleapis.com/fitness/v1",
            redirect_uri=settings.google_fit_redirect_uri,
        ),
        "whoop": OAuthDeviceConfig(
            device_type="whoop",
            client_id=settings.whoop_client_id,
            client_secret=settings.whoop_client_secret,
            authorize_url="https://api.prod.whoop.com/oauth/oauth2/auth",
            token_url="https://api.prod.whoop.com/oauth/oauth2/token",
            scopes=["read:recovery", "read:cycles", "read:sleep", "read:workout",
                     "read:profile", "read:body_measurement"],
            api_base_url="https://api.prod.whoop.com/developer/v1",
            redirect_uri=settings.whoop_redirect_uri,
        ),
    }


# In-memory state store for OAuth CSRF (in production, use Redis)
_pending_states: dict[str, dict] = {}


def generate_auth_url(device_type: str, user_id: str = "default") -> str:
    """Generate OAuth authorization URL with state token."""
    if device_type not in OAUTH_CONFIGS:
        raise ValueError(f"Unknown OAuth device: {device_type}")

    cfg = OAUTH_CONFIGS[device_type]
    state = secrets.token_urlsafe(32)

    _pending_states[state] = {
        "device_type": device_type,
        "user_id": user_id,
        "created_at": datetime.now(timezone.utc),
    }

    scope_str = " ".join(cfg.scopes)
    params = {
        "client_id": cfg.client_id,
        "response_type": "code",
        "scope": scope_str,
        "state": state,
        "redirect_uri": cfg.redirect_uri,
    }
    # Google requires access_type=offline for refresh tokens
    if device_type == "google_fit":
        params["access_type"] = "offline"
        params["prompt"] = "consent"

    query = "&".join(f"{k}={v}" for k, v in params.items())
    return f"{cfg.authorize_url}?{query}"


async def handle_callback(
    pool: asyncpg.Pool,
    state: str,
    code: str,
) -> dict:
    """Exchange authorization code for tokens and store them."""
    session = _pending_states.pop(state, None)
    if not session:
        raise ValueError("Invalid or expired state token")

    # Check expiry (10 min)
    age = datetime.now(timezone.utc) - session["created_at"]
    if age > timedelta(minutes=10):
        raise ValueError("State token expired")

    device_type = session["device_type"]
    user_id = session["user_id"]
    cfg = OAUTH_CONFIGS[device_type]

    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": cfg.redirect_uri,
        }

        if cfg.use_basic_auth:
            # Fitbit uses Basic auth header
            creds = b64encode(f"{cfg.client_id}:{cfg.client_secret}".encode()).decode()
            headers["Authorization"] = f"Basic {creds}"
        else:
            data["client_id"] = cfg.client_id
            data["client_secret"] = cfg.client_secret

        resp = await client.post(cfg.token_url, data=data, headers=headers)
        resp.raise_for_status()
        token_data = resp.json()

    # Calculate expiry
    expires_at = None
    if "expires_in" in token_data:
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=token_data["expires_in"])

    # Store tokens
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO oauth_tokens
                (user_id, device_type, access_token, refresh_token,
                 token_type, expires_at, scope, raw_token_response, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, NOW())
            ON CONFLICT (user_id, device_type) DO UPDATE SET
                access_token = EXCLUDED.access_token,
                refresh_token = COALESCE(EXCLUDED.refresh_token, oauth_tokens.refresh_token),
                token_type = EXCLUDED.token_type,
                expires_at = EXCLUDED.expires_at,
                scope = EXCLUDED.scope,
                raw_token_response = EXCLUDED.raw_token_response,
                updated_at = NOW()
            """,
            user_id,
            device_type,
            token_data.get("access_token"),
            token_data.get("refresh_token"),
            token_data.get("token_type", "Bearer"),
            expires_at,
            " ".join(cfg.scopes),
            json.dumps(token_data),
        )

    logger.info(f"OAuth tokens stored for {device_type} (user={user_id})")
    return {"device_type": device_type, "user_id": user_id}


async def get_valid_token(
    pool: asyncpg.Pool,
    device_type: str,
    user_id: str = "default",
) -> str:
    """Get a valid access token, refreshing if expired."""
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT access_token, refresh_token, expires_at
            FROM oauth_tokens
            WHERE user_id = $1 AND device_type = $2
            """,
            user_id, device_type,
        )

    if not row:
        raise ValueError(f"No token for {device_type} (user={user_id}). Connect device first.")

    # Check expiry (5 min buffer)
    if row["expires_at"] and datetime.now(timezone.utc) > row["expires_at"] - timedelta(minutes=5):
        if row["refresh_token"]:
            return await _refresh_token(pool, device_type, user_id, row["refresh_token"])
        raise ValueError(f"Token expired for {device_type} and no refresh token available")

    return row["access_token"]


async def _refresh_token(
    pool: asyncpg.Pool,
    device_type: str,
    user_id: str,
    refresh_token: str,
) -> str:
    """Refresh an expired access token."""
    cfg = OAUTH_CONFIGS[device_type]

    async with httpx.AsyncClient() as client:
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        data = {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
        }

        if cfg.use_basic_auth:
            creds = b64encode(f"{cfg.client_id}:{cfg.client_secret}".encode()).decode()
            headers["Authorization"] = f"Basic {creds}"
        else:
            data["client_id"] = cfg.client_id
            data["client_secret"] = cfg.client_secret

        resp = await client.post(cfg.token_url, data=data, headers=headers)
        resp.raise_for_status()
        token_data = resp.json()

    expires_at = None
    if "expires_in" in token_data:
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=token_data["expires_in"])

    async with pool.acquire() as conn:
        await conn.execute(
            """
            UPDATE oauth_tokens SET
                access_token = $1,
                refresh_token = COALESCE($2, refresh_token),
                expires_at = $3,
                raw_token_response = $4::jsonb,
                updated_at = NOW()
            WHERE user_id = $5 AND device_type = $6
            """,
            token_data.get("access_token"),
            token_data.get("refresh_token"),
            expires_at,
            json.dumps(token_data),
            user_id,
            device_type,
        )

    logger.info(f"Token refreshed for {device_type} (user={user_id})")
    return token_data["access_token"]


# ─── SMART on FHIR OAuth Functions ─────────────────────────────
# These are separate from the wearable OAuth flow because FHIR endpoints
# are dynamic (each hospital has different authorize/token URLs stored in DB).


async def generate_fhir_auth_url(
    pool: asyncpg.Pool,
    endpoint_id: str,
    user_id: str = "default",
) -> str:
    """Generate SMART on FHIR authorization URL for a hospital.

    Requires the endpoint to already be registered in fhir_endpoints table
    (with discovered authorize_url). Use discovery.ensure_endpoint_registered() first.
    """
    from ..fhir.discovery import get_endpoint

    endpoint = await get_endpoint(pool, endpoint_id)
    if not endpoint:
        raise ValueError(f"FHIR endpoint not found: {endpoint_id}")
    if not endpoint["authorize_url"]:
        raise ValueError(f"No authorize_url for endpoint {endpoint_id}. Re-run SMART discovery.")

    state = secrets.token_urlsafe(32)
    _pending_states[state] = {
        "device_type": f"fhir:{endpoint_id}",
        "endpoint_id": endpoint_id,
        "user_id": user_id,
        "created_at": datetime.now(timezone.utc),
        "is_fhir": True,
    }

    scopes = settings.fhir_default_scopes
    params = {
        "response_type": "code",
        "client_id": settings.fhir_client_id,
        "redirect_uri": settings.fhir_redirect_uri,
        "scope": scopes,
        "state": state,
        "aud": endpoint["fhir_base_url"],  # SMART-specific: tells auth server which FHIR server
    }

    return f"{endpoint['authorize_url']}?{urlencode(params)}"


async def handle_fhir_callback(
    pool: asyncpg.Pool,
    state: str,
    code: str,
) -> dict:
    """Handle SMART on FHIR OAuth callback — exchange code, store tokens + patient ID."""
    from ..fhir.discovery import get_endpoint, ensure_fhir_device_registered

    session = _pending_states.pop(state, None)
    if not session or not session.get("is_fhir"):
        raise ValueError("Invalid or expired FHIR state token")

    age = datetime.now(timezone.utc) - session["created_at"]
    if age > timedelta(minutes=10):
        raise ValueError("State token expired")

    endpoint_id = session["endpoint_id"]
    user_id = session["user_id"]
    device_type = f"fhir:{endpoint_id}"

    endpoint = await get_endpoint(pool, endpoint_id)
    if not endpoint:
        raise ValueError(f"FHIR endpoint disappeared: {endpoint_id}")

    # Exchange code for tokens
    async with httpx.AsyncClient(timeout=30.0) as client:
        data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": settings.fhir_redirect_uri,
            "client_id": settings.fhir_client_id,
        }
        # Confidential client: include secret if configured
        if settings.fhir_client_secret:
            data["client_secret"] = settings.fhir_client_secret
        headers = {"Content-Type": "application/x-www-form-urlencoded"}

        resp = await client.post(endpoint["token_url"], data=data, headers=headers)
        if resp.status_code != 200:
            logger.error(f"FHIR token exchange failed: {resp.status_code} {resp.text}")
        resp.raise_for_status()
        token_data = resp.json()

    # SMART on FHIR returns patient ID in the token response
    fhir_patient_id = token_data.get("patient")

    expires_at = None
    if "expires_in" in token_data:
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=token_data["expires_in"])

    # Ensure devices row exists for FK constraint
    await ensure_fhir_device_registered(pool, endpoint_id, endpoint["display_name"])

    async with pool.acquire() as conn:
        # Store tokens (reuses the same oauth_tokens table)
        await conn.execute(
            """
            INSERT INTO oauth_tokens
                (user_id, device_type, access_token, refresh_token,
                 token_type, expires_at, scope, raw_token_response, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, NOW())
            ON CONFLICT (user_id, device_type) DO UPDATE SET
                access_token = EXCLUDED.access_token,
                refresh_token = COALESCE(EXCLUDED.refresh_token, oauth_tokens.refresh_token),
                token_type = EXCLUDED.token_type,
                expires_at = EXCLUDED.expires_at,
                scope = EXCLUDED.scope,
                raw_token_response = EXCLUDED.raw_token_response,
                updated_at = NOW()
            """,
            user_id,
            device_type,
            token_data.get("access_token"),
            token_data.get("refresh_token"),
            token_data.get("token_type", "Bearer"),
            expires_at,
            token_data.get("scope", settings.fhir_default_scopes),
            json.dumps(token_data),
        )

        # Track connection in fhir_user_connections
        await conn.execute(
            """
            INSERT INTO fhir_user_connections
                (user_id, endpoint_id, fhir_patient_id, status, connected_at)
            VALUES ($1, $2, $3, 'active', NOW())
            ON CONFLICT (user_id, endpoint_id) DO UPDATE SET
                fhir_patient_id = COALESCE(EXCLUDED.fhir_patient_id, fhir_user_connections.fhir_patient_id),
                status = 'active',
                last_error = NULL,
                connected_at = NOW()
            """,
            user_id,
            endpoint_id,
            fhir_patient_id,
        )

    logger.info(f"FHIR tokens stored for {endpoint_id} (user={user_id}, patient={fhir_patient_id})")
    return {
        "device_type": device_type,
        "endpoint_id": endpoint_id,
        "user_id": user_id,
        "fhir_patient_id": fhir_patient_id,
    }


async def get_valid_fhir_token(
    pool: asyncpg.Pool,
    endpoint_id: str,
    user_id: str = "default",
) -> str:
    """Get a valid FHIR access token, refreshing if expired."""
    device_type = f"fhir:{endpoint_id}"

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT access_token, refresh_token, expires_at FROM oauth_tokens WHERE user_id = $1 AND device_type = $2",
            user_id, device_type,
        )

    if not row:
        raise ValueError(f"No FHIR token for {endpoint_id} (user={user_id}). Connect hospital first.")

    if row["expires_at"] and datetime.now(timezone.utc) > row["expires_at"] - timedelta(minutes=5):
        if row["refresh_token"]:
            return await _refresh_fhir_token(pool, endpoint_id, user_id, row["refresh_token"])
        raise ValueError(f"FHIR token expired for {endpoint_id} and no refresh token available")

    return row["access_token"]


async def _refresh_fhir_token(
    pool: asyncpg.Pool,
    endpoint_id: str,
    user_id: str,
    refresh_token: str,
) -> str:
    """Refresh an expired FHIR access token."""
    from ..fhir.discovery import get_endpoint

    endpoint = await get_endpoint(pool, endpoint_id)
    if not endpoint:
        raise ValueError(f"FHIR endpoint not found: {endpoint_id}")

    device_type = f"fhir:{endpoint_id}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        data = {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": settings.fhir_client_id,
        }
        if settings.fhir_client_secret:
            data["client_secret"] = settings.fhir_client_secret

        headers = {"Content-Type": "application/x-www-form-urlencoded"}

        resp = await client.post(endpoint["token_url"], data=data, headers=headers)
        if resp.status_code != 200:
            logger.error(f"FHIR token refresh failed: {resp.status_code} {resp.text}")
        resp.raise_for_status()
        token_data = resp.json()

    expires_at = None
    if "expires_in" in token_data:
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=token_data["expires_in"])

    async with pool.acquire() as conn:
        await conn.execute(
            """
            UPDATE oauth_tokens SET
                access_token = $1,
                refresh_token = COALESCE($2, refresh_token),
                expires_at = $3,
                raw_token_response = $4::jsonb,
                updated_at = NOW()
            WHERE user_id = $5 AND device_type = $6
            """,
            token_data.get("access_token"),
            token_data.get("refresh_token"),
            expires_at,
            json.dumps(token_data),
            user_id,
            device_type,
        )

    logger.info(f"FHIR token refreshed for {endpoint_id} (user={user_id})")
    return token_data["access_token"]
