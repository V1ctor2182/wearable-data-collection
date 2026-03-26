"""Configuration management via environment variables."""
from __future__ import annotations

from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional


class Settings(BaseSettings):
    # Database
    db_host: str = "localhost"
    db_port: int = 5432
    db_name: str = "wearable_raw"
    db_user: str = "victor"
    db_password: str = ""

    # Server
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    oauth_callback_base: str = "http://localhost:8000"

    # Fitbit
    fitbit_client_id: str = ""
    fitbit_client_secret: str = ""
    fitbit_redirect_uri: str = ""

    # Oura
    oura_client_id: str = ""
    oura_client_secret: str = ""
    oura_redirect_uri: str = ""

    # Google Fit
    google_fit_client_id: str = ""
    google_fit_client_secret: str = ""
    google_fit_redirect_uri: str = ""

    # WHOOP
    whoop_client_id: str = ""
    whoop_client_secret: str = ""
    whoop_redirect_uri: str = ""

    # FHIR / SMART on FHIR
    fhir_client_id: str = ""
    fhir_client_secret: str = ""
    fhir_redirect_uri: str = ""
    # SMART v1 scope syntax: .read = read access
    fhir_default_scopes: str = "launch/patient openid fhirUser patient/Patient.read patient/Observation.read patient/Condition.read patient/MedicationRequest.read patient/Procedure.read patient/Immunization.read patient/AllergyIntolerance.read patient/DocumentReference.read"

    # Terra (disabled)
    # terra_api_key: str = ""
    # terra_dev_id: str = ""
    # terra_signing_secret: str = ""

    # Upload
    upload_temp_dir: str = "./tmp/uploads"
    max_file_size_mb: int = 500

    # Scheduler
    scheduler_enabled: bool = True
    sync_interval_hours: int = 4

    @property
    def db_dsn(self) -> str:
        if self.db_password:
            return f"postgresql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"
        return f"postgresql://{self.db_user}@{self.db_host}:{self.db_port}/{self.db_name}"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
