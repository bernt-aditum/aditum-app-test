"""Governed data read.

Reads live through the Aditum query API using this app's scoped, read-only
service token. The app never holds raw connector credentials and can never
write — exactly the same governed boundary as the builder preview. Returns
{t, value} points, or nothing. Never fabricates.
"""
from __future__ import annotations

from typing import Any

import httpx

from app.config import get_config

_TIME = ["_time", "timestamp", "time", "t", "_start", "date"]
_VALUE = ["_value", "value", "val", "reading"]


class GovernedError(Exception):
    pass


def _pick(cols: list[str], cands: list[str]) -> str | None:
    for c in cands:
        if c in cols:
            return c
    return None


async def read_series(connector_id: str, tag: str, window_days: int, limit: int = 500) -> list[dict[str, Any]]:
    cfg = get_config()
    if not cfg.aditum_api_base or not cfg.app_data_token:
        raise GovernedError("Data access is not configured")
    body = {
        "connector_id": connector_id,
        "target": "",  # all tags; post-filter by tag below
        "window_days": window_days,
        "tags": {cfg.tag_column: tag} if tag else None,
        "limit": limit,
    }
    url = cfg.aditum_api_base + "/api/data/query"
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(url, json=body, headers={"Authorization": f"Bearer {cfg.app_data_token}"})
    except httpx.HTTPError as e:
        raise GovernedError(f"Query unreachable: {e}") from e
    if r.status_code != 200:
        raise GovernedError(f"Query failed ({r.status_code})")
    try:
        rows = r.json().get("rows", [])
    except ValueError as e:
        raise GovernedError("Query returned non-JSON") from e
    if not rows:
        return []
    cols = list(rows[0].keys())
    tcol, vcol = _pick(cols, _TIME), _pick(cols, _VALUE)
    if not tcol or not vcol:
        return []
    out: list[dict[str, Any]] = []
    for row in rows:
        t, v = row.get(tcol), row.get(vcol)
        if t is None or v is None:
            continue
        try:
            v = float(v)
        except (TypeError, ValueError):
            continue
        out.append({"t": str(t), "value": v})
    out.sort(key=lambda p: p["t"])
    return out
