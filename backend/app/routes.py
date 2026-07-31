"""App API: serves the read-only manifest and governed series reads.

Every data route requires a signed-in Aditum user. The manifest describes what
the app renders; the frontend reads it and asks for each component's series.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from app import analytics
from app.auth import User, current_user
from app.config import get_config
from app.governed import GovernedError, read_series

router = APIRouter(prefix="/api")


@router.get("/healthz")
async def healthz() -> dict:
    return {"ok": True}


@router.get("/manifest")
async def manifest(_user: User = Depends(current_user)) -> dict:
    return get_config().manifest


@router.get("/config")
async def config(_user: User = Depends(current_user)) -> dict:
    """App metadata + the connectors it reads from — the provenance the app shows
    its own users (where the data really comes from)."""
    cfg = get_config()
    m = cfg.manifest
    return {
        "app_name": m.get("app_name", "Aditum App"),
        "description": m.get("description", ""),
        "reference_architecture": m.get("reference_architecture", ""),
        "connectors": cfg.app_connectors,
        "primary_connector_id": cfg.app_connector_id,
    }


@router.get("/series")
async def series(
    tag: str = Query(..., description="Tag / series"),
    connector_id: str | None = Query(default=None, description="Defaults to the app's configured connector"),
    window_days: int = Query(7, ge=1, le=3650),
    _user: User = Depends(current_user),
) -> dict:
    cfg = get_config()
    cid = connector_id or cfg.app_connector_id
    if not cid:
        raise HTTPException(status_code=400, detail="No connector configured for this app")
    try:
        points = await read_series(cid, tag, window_days)
    except GovernedError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    return {"tag": tag, "points": points, "count": len(points), "connector_id": cid}


@router.get("/aggregate")
async def aggregate(
    tag: str = Query(..., description="Tag / series"),
    connector_id: str | None = Query(default=None),
    window_days: int = Query(30, ge=1, le=3650),
    rule: str = Query("1D", description="pandas bucket, e.g. 1H / 1D / 1W"),
    how: str = Query("mean", description="mean|sum|max|min|last"),
    _user: User = Depends(current_user),
) -> dict:
    """Server-side processing (pandas/numpy): bucketed aggregation for bar charts,
    plus stats and a least-squares trend. Reads real governed data only."""
    cfg = get_config()
    cid = connector_id or cfg.app_connector_id
    if not cid:
        raise HTTPException(status_code=400, detail="No connector configured for this app")
    try:
        points = await read_series(cid, tag, window_days, limit=5000)
    except GovernedError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    return {
        "tag": tag,
        "buckets": analytics.bucket_aggregate(points, rule=rule, how=how),
        "stats": analytics.basic_stats(points),
        "trend": analytics.linear_trend(points),
    }
