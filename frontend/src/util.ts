import type { Point } from "./api";

// Pure data transforms — real data only, no fill or fabrication.

export function agg(points: Point[], kind: string): number | null {
  if (!points.length) return null;
  const v = points.map((p) => p.value);
  const r = (n: number) => Math.round(n * 1000) / 1000;
  switch (kind) {
    case "mean":
      return r(v.reduce((a, b) => a + b, 0) / v.length);
    case "max":
      return r(Math.max(...v));
    case "min":
      return r(Math.min(...v));
    case "sum":
      return r(v.reduce((a, b) => a + b, 0));
    default:
      return r(v[v.length - 1]);
  }
}

// Mean per calendar day (feeds bar / stacked-bar). Days with no data are absent,
// never zero-filled.
export function bucketByDay(points: Point[]): { day: string; value: number }[] {
  const groups = new Map<string, number[]>();
  for (const p of points) {
    const day = p.t.slice(0, 10);
    const arr = groups.get(day);
    if (arr) arr.push(p.value);
    else groups.set(day, [p.value]);
  }
  return [...groups.entries()]
    .map(([day, vs]) => ({ day, value: Math.round((vs.reduce((a, b) => a + b, 0) / vs.length) * 1000) / 1000 }))
    .sort((a, b) => a.day.localeCompare(b.day));
}

// Pair two series by index into {x, y} scatter points — only real pairs.
export function pairXY(xs: Point[], ys: Point[]): { x: number; y: number }[] {
  const n = Math.min(xs.length, ys.length);
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) out.push({ x: xs[i].value, y: ys[i].value });
  return out;
}
