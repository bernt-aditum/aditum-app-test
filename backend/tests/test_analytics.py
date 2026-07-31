"""Ships with the generated app — pandas/numpy processing is tested, not assumed."""
from app.analytics import basic_stats, bucket_aggregate, linear_trend

_PTS = [{"t": f"2026-07-{d:02d}T00:00:00Z", "value": float(d)} for d in range(1, 11)]


def test_basic_stats():
    s = basic_stats(_PTS)
    assert s["count"] == 10
    assert s["min"] == 1.0 and s["max"] == 10.0
    assert abs(s["mean"] - 5.5) < 1e-9


def test_basic_stats_empty():
    assert basic_stats([]) == {}


def test_bucket_aggregate_daily():
    buckets = bucket_aggregate(_PTS, rule="1D", how="mean")
    assert len(buckets) == 10
    assert buckets[0]["value"] == 1.0


def test_linear_trend_is_positive():
    trend = linear_trend(_PTS)
    assert trend["slope_per_sec"] > 0
