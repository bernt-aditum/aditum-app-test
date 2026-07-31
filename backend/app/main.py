"""Generated Aditum app — FastAPI backend.

Vetted template: behavior is fixed and audited, parameterized only by the
injected manifest + deploy config. It authenticates end users via Aditum SSO and
reads data through the governed Aditum query API with a scoped read-only token.
"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_config
from app.routes import router

app = FastAPI(title="Aditum App")

_cfg = get_config()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if _cfg.frontend_origin == "*" else [_cfg.frontend_origin],
    allow_methods=["GET"],
    allow_headers=["Authorization", "Content-Type"],
)
app.include_router(router)
