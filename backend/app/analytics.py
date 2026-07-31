"""Numerical helpers for the app backend.

pandas / numpy / scipy / scikit-learn are always available — industrial apps are
mostly about numerical data and processing, so heavy lifting belongs here in the
FastAPI backend, keeping routes thin and the frontend focused on crisp visuals.
All inputs are governed {t, value} points; nothing is ever fabricated.
"""
from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd


def to_frame(points: list[dict[str, Any]]) -> pd.DataFrame:
    if not points:
        return pd.DataFrame(columns=["t", "value"])
    df = pd.DataFrame(points)
    df["t"] = pd.to_datetime(df["t"], errors="coerce", utc=True)
    df["value"] = pd.to_numeric(df["value"], errors="coerce")
    return df.dropna(subset=["t", "value"]).sort_values("t")


def basic_stats(points: list[dict[str, Any]]) -> dict:
    df = to_frame(points)
    if df.empty:
        return {}
    v = df["value"].to_numpy()
    return {
        "count": int(v.size),
        "last": float(v[-1]),
        "mean": float(np.mean(v)),
        "min": float(np.min(v)),
        "max": float(np.max(v)),
        "std": float(np.std(v)),
    }


def bucket_aggregate(points: list[dict[str, Any]], rule: str = "1D", how: str = "mean") -> list[dict]:
    """Resample to fixed time buckets (feeds bar / stacked-bar charts).

    rule: a pandas offset such as '1H', '1D', '1W'. how: mean|sum|max|min|last.
    """
    df = to_frame(points)
    if df.empty:
        return []
    series = df.set_index("t")["value"].resample(rule)
    agg = getattr(series, how, series.mean)()
    return [
        {"t": idx.isoformat(), "value": None if pd.isna(val) else float(val)}
        for idx, val in agg.items()
    ]


def linear_trend(points: list[dict[str, Any]]) -> dict:
    """Least-squares trend (slope + intercept). numpy-based; scikit-learn is
    available for heavier modelling when an app needs it."""
    df = to_frame(points)
    if len(df) < 2:
        return {}
    x = (df["t"].astype("int64") // 10**9).to_numpy(dtype=float)
    x = x - x[0]
    y = df["value"].to_numpy(dtype=float)
    slope, intercept = np.polyfit(x, y, 1)
    return {"slope_per_sec": float(slope), "intercept": float(intercept)}
