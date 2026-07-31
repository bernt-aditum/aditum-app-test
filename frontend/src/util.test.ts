import { describe, expect, it } from "vitest";
import { agg, bucketByDay, pairXY } from "./util";

const pts = (vals: number[]) => vals.map((v, i) => ({ t: `2026-07-0${(i % 9) + 1}T00:00:00Z`, value: v }));

describe("agg", () => {
  it("computes mean / max / last, null on empty", () => {
    expect(agg(pts([1, 2, 3]), "mean")).toBe(2);
    expect(agg(pts([1, 2, 3]), "max")).toBe(3);
    expect(agg(pts([1, 2, 3]), "last")).toBe(3);
    expect(agg([], "mean")).toBe(null);
  });
});

describe("bucketByDay", () => {
  it("means per day, sorted, no zero-fill", () => {
    const b = bucketByDay([
      { t: "2026-07-01T00:00:00Z", value: 2 },
      { t: "2026-07-01T12:00:00Z", value: 4 },
      { t: "2026-07-02T00:00:00Z", value: 10 },
    ]);
    expect(b).toEqual([
      { day: "2026-07-01", value: 3 },
      { day: "2026-07-02", value: 10 },
    ]);
  });
});

describe("pairXY", () => {
  it("pairs by index up to the shorter length", () => {
    expect(pairXY(pts([1, 2, 3]), pts([4, 5]))).toEqual([
      { x: 1, y: 4 },
      { x: 2, y: 5 },
    ]);
  });
});
