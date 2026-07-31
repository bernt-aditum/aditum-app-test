"""End-user authentication via Aditum SSO.

Validates the user's Aditum-issued JWT and gates every data endpoint. This is
IDENTITY only — the data credential (APP_DATA_TOKEN) is separate, so a signed-in
user can only ever read what this app is scoped to, never more.

v1 validates the Aditum session JWT with the shared HS256 secret (the same
mechanism the platform already uses). Customer-Azure hardening (RS256/JWKS or
token introspection) swaps only this module — nothing else changes.
"""
from __future__ import annotations

from dataclasses import dataclass

import jwt
from fastapi import HTTPException, Request

from app.config import get_config


@dataclass
class User:
    email: str


def current_user(request: Request) -> User:
    cfg = get_config()
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Sign in with your Aditum account")
    token = header[7:].strip()
    if not cfg.aditum_jwt_secret:
        raise HTTPException(status_code=503, detail="Auth is not configured")
    try:
        payload = jwt.decode(token, cfg.aditum_jwt_secret, algorithms=[cfg.aditum_jwt_algorithm])
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid or expired session: {e}") from e
    email = (payload.get("email") or payload.get("sub") or "").lower()
    if not email:
        raise HTTPException(status_code=401, detail="Session missing identity")
    if cfg.allowed_emails and email not in cfg.allowed_emails:
        raise HTTPException(status_code=403, detail="You are not authorized for this app")
    return User(email=email)
