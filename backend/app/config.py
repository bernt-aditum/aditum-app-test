"""Runtime config for a generated Aditum app.

Everything is injected at deploy time — no secrets are ever baked into the
frontend or the repo. Two distinct credentials, kept separate on purpose:

  * ADITUM_JWT_SECRET  — validates the END USER's Aditum SSO login (identity).
  * APP_DATA_TOKEN     — the scoped, read-only Aditum service token this app
                         uses to READ data through the governed query API.

Raw connector credentials never live here; the app only ever reads through the
governed Aditum API.
"""
from __future__ import annotations

import json
import os
from functools import lru_cache
from pathlib import Path

_MANIFEST_PATH = Path(__file__).resolve().parent / "manifest.json"


class Config:
    def __init__(self) -> None:
        # --- End-user auth: Aditum SSO ---
        self.aditum_jwt_secret = os.getenv("ADITUM_JWT_SECRET", "")
        self.aditum_jwt_algorithm = os.getenv("ADITUM_JWT_ALGORITHM", "HS256")
        self.aditum_login_url = os.getenv("ADITUM_LOGIN_URL", "https://aditumdata.com").rstrip("/")
        self.allowed_emails = {
            e.strip().lower() for e in os.getenv("APP_ALLOWED_EMAILS", "").split(",") if e.strip()
        }
        # --- Governed data read: scoped, read-only service token ---
        self.aditum_api_base = os.getenv("ADITUM_API_BASE", "").rstrip("/")
        self.app_data_token = os.getenv("APP_DATA_TOKEN", "")
        self.tag_column = os.getenv("ADITUM_TAG_COLUMN", "tag")
        # Which Aditum connector(s) this app reads from (chosen at build time).
        self.app_connector_id = os.getenv("APP_CONNECTOR_ID", "")
        try:
            self.app_connectors = json.loads(os.getenv("APP_CONNECTORS_JSON", "[]"))
        except json.JSONDecodeError:
            self.app_connectors = []
        # --- CORS ---
        self.frontend_origin = os.getenv("FRONTEND_ORIGIN", "*")

    @property
    def manifest(self) -> dict:
        try:
            return json.loads(_MANIFEST_PATH.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return {}


@lru_cache
def get_config() -> Config:
    return Config()
