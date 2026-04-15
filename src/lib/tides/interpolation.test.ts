/**
 * Tests for tide interpolation and time-series merging.
 */
import { describe, it, expect } from "vitest";
import {
  interpolateHeight,
  computeTideState,
  mergeTimeSeries,
  computeAffineTransform,
} from "@/lib/tides/interpolation";
import type { TidePoint } from "@/lib/tides/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pt(isoOrHour: string | number, height: number): TidePoint {
  if (typeof isoOrHour === "string") {
    return { time: isoOrHour, height };
  }
  const base = new Date("2025-04-01T00:00:00Z");
  return {
    time: new Date(base.getTime() + isoOrHour * 3600_000).toISOString(),
    height,
  };
}

// ---------------------------------------------------------------------------
// interpolateHeight
// ---------------------------------------------------------------------------

describe("interpolateHeight", () => {
  const points: TidePoint[] = [
    pt(0, 1.0),
    pt(1, 2.0),
    pt(2, 3.0),
    pt(3, 2.0),
  ];

  it("returns exact height when time matches a point", () => {
    const h = interpolateHeight(points, new Date("2025-04-01T01:00:00Z"));
    expect(h).toBeCloseTo(2.0, 3);
  });

  it("interpolates linearly between two points", () => {
    // Midpoint between hour 0 (1.0) and hour 1 (2.0) → 1.5
    const h = interpolateHeight(points, new Date("2025-04-01T00:30:00Z"));
    expect(h).toBeCloseTo(1.5, 3);
  });

  it("interpolates at 25% between points", () => {
    // 25% between hour 1 (2.0) and hour 2 (3.0) → 2.25
    const h = interpolateHeight(points, new Date("2025-04-01T01:15:00Z"));
    expect(h).toBeCloseTo(2.25, 3);
  });

  it("clamps to first point when before data range", () => {
    const h = interpolateHeight(points, new Date("2025-03-31T23:00:00Z"));
    expect(h).toBe(1.0);
  });

  it("clamps to last point when after data range", () => {
    const h = interpolateHeight(points, new Date("2025-04-01T10:00:00Z"));
    expect(h).toBe(2.0);
  });

  it("returns null for empty array", () => {
    expect(interpolateHeight([], new Date())).toBeNull();
  });

  it("handles a single point", () => {
    const h = interpolateHeight([pt(0, 5.5)], new Date("2025-04-01T00:00:00Z"));
    expect(h).toBe(5.5);
  });

  it("handles duplicate timestamps (division-by-zero guard)", () => {
    // Two points at the exact same time — should return the first point's height
    const sameTime = "2025-04-01T01:00:00Z";
    const h = interpolateHeight(
      [pt(sameTime, 2.0), pt(sameTime, 3.0)],
      new Date(sameTime),
    );
    expect(h).toBe(2.0);
  });

  it("handles query between duplicate-timestamp points", () => {
    // If points 1 and 2 have the same timestamp, and we query in between points 0 and 3
    const dupes: TidePoint[] = [
      pt(0, 1.0),
      pt(1, 2.0),
      { time: new Date("2025-04-01T01:00:00Z").toISOString(), height: 2.5 }, // duplicate of hour 1
      pt(2, 3.0),
    ];
    // Query at the duplicate time
    const h = interpolateHeight(dupes, new Date("2025-04-01T01:00:00Z"));
    expect(h).toBe(2.0);
  });
});

// ---------------------------------------------------------------------------
// mergeTimeSeries
// ---------------------------------------------------------------------------

describe("mergeTimeSeries", () => {
  it("returns forecast when observations are empty", () => {
    const forecast = [pt(0, 1), pt(1, 2)];
    expect(mergeTimeSeries([], forecast)).toEqual(forecast);
  });

  it("returns zero-mean normalized observations when forecast is empty", () => {
    const obs = [pt(0, 10), pt(1, 12)];
    // Mean is 11, so normalized values should be -1 and +1
    const result = mergeTimeSeries(obs, []);
    expect(result).toHaveLength(2);
    expect(result[0].height).toBeCloseTo(-1.0, 3);
    expect(result[1].height).toBeCloseTo(1.0, 3);
  });

  it("aligns observations to forecast datum and blends at transition", () => {
    // Obs: centered at 102, same spread as forecast → scale ≈ 1
    // 5 hours of obs (short enough that blend zone covers all of it partially)
    const obs = [pt(0, 101), pt(1, 102), pt(2, 103), pt(3, 102), pt(4, 101)];
    const forecast = [pt(0, 1.0), pt(1, 2.0), pt(2, 3.0), pt(3, 2.0), pt(4, 1.0), pt(5, 0.5), pt(6, 1.5)];

    const merged = mergeTimeSeries(obs, forecast);

    // First points (before blend zone) should be pure normalized obs
    // Obs mean ≈ fcst mean in overlap, scale ≈ 1
    expect(merged[0].height).toBeCloseTo(1.0, 1);

    // Last obs point should be heavily blended toward forecast
    // Should NOT have a big jump to the next forecast point
    const lastObsIdx = 4; // hour 4
    const firstFcstIdx = 5; // hour 5
    const jump = Math.abs(merged[firstFcstIdx].height - merged[lastObsIdx].height);
    // Jump should be reasonable (< 1m), not a 2.7m cliff
    expect(jump).toBeLessThan(1.0);

    // Forecast continuation should be present
    expect(merged).toHaveLength(7);
    expect(merged[5].height).toBe(0.5); // forecast hour 5
    expect(merged[6].height).toBe(1.5); // forecast hour 6
  });

  it("produces smooth transition even with phase-shifted forecast", () => {
    // Simulate the real problem: obs shows tide rising, forecast says it should be falling
    // Obs: rising from 0 to +2 over hours 0-6
    const obs: TidePoint[] = [];
    for (let h = 0; h <= 6; h++) {
      obs.push(pt(h, 100 + (h / 6) * 2)); // 100 → 102 (chart datum)
    }
    // Forecast: different phase — falling from +1 to -1 over hours 0-8
    const forecast: TidePoint[] = [];
    for (let h = 0; h <= 8; h++) {
      forecast.push(pt(h, 1 - (h / 8) * 2)); // +1 → -1
    }

    const merged = mergeTimeSeries(obs, forecast);

    // Key check: no impossible jump at the transition (hour 6 → hour 7)
    for (let i = 1; i < merged.length; i++) {
      const dt =
        (new Date(merged[i].time).getTime() -
          new Date(merged[i - 1].time).getTime()) /
        3600_000;
      if (dt > 0) {
        const dh = Math.abs(merged[i].height - merged[i - 1].height);
        const rate = dh / dt; // meters per hour
        // Tides move at most ~0.5m/hour typically, allow up to 2m/h for safety
        expect(rate).toBeLessThan(2.0);
      }
    }
  });

  it("handles non-overlapping series (forecast starts after obs)", () => {
    const obs = [pt(0, 101), pt(1, 102)];
    const forecast = [pt(5, 10), pt(6, 11)];

    // No overlap: obsMean=101.5, fcstMean=0, scale=1, no blending
    const merged = mergeTimeSeries(obs, forecast);
    expect(merged).toHaveLength(4);
    expect(merged[0].height).toBeCloseTo(-0.5, 3); // 101 - 101.5
    expect(merged[1].height).toBeCloseTo(0.5, 3);  // 102 - 101.5
    expect(merged[2].height).toBe(10); // forecast
    expect(merged[3].height).toBe(11); // forecast
  });

  it("handles single-point observations", () => {
    const obs = [pt(0, 100)];
    const forecast = [pt(0, 1), pt(1, 2)];

    // Should not crash — single obs means obsMean=100, scale may be 1
    const merged = mergeTimeSeries(obs, forecast);
    expect(merged.length).toBeGreaterThan(0);
  });

  it("handles single-point forecast", () => {
    const obs = [pt(0, 100), pt(1, 102)];
    const forecast = [pt(2, 1)];

    const merged = mergeTimeSeries(obs, forecast);
    // Should have obs + forecast point after obs
    expect(merged.length).toBeGreaterThanOrEqual(2);
    // Forecast point is after obs, so it should be appended
    expect(merged[merged.length - 1].height).toBe(1);
  });

  it("handles zero-width blend zone (obsEnd === blendStart) without division-by-zero", () => {
    // Overlap is shorter than BLEND_HOURS (3h), so blendStart might equal obsEnd
    // for very short overlaps
    const obs = [pt(0, 100)];
    const forecast = [pt(0, 1), pt(1, 2), pt(2, 3)];

    // Should not throw, even if blend zone is zero-width
    const merged = mergeTimeSeries(obs, forecast);
    expect(merged.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// computeAffineTransform
// ---------------------------------------------------------------------------

describe("computeAffineTransform", () => {
  it("returns identity transform for empty observations", () => {
    const transform = computeAffineTransform([], [pt(0, 1)]);
    expect(transform.obsMean).toBe(0);
    expect(transform.fcstMean).toBe(0);
    expect(transform.scale).toBe(1);
  });

  it("returns mean-only transform for empty forecast", () => {
    const transform = computeAffineTransform([pt(0, 10), pt(1, 12)], []);
    expect(transform.obsMean).toBe(11);
    expect(transform.fcstMean).toBe(0);
    expect(transform.scale).toBe(1);
  });

  it("computes correct scale when amplitudes differ", () => {
    // Obs: [48, 50, 52] → mean=50, stddev=1.633
    // Fcst: [-1, 0, 1] → mean=0, stddev=0.816
    const transform = computeAffineTransform(
      [pt(0, 48), pt(1, 50), pt(2, 52)],
      [pt(0, -1), pt(1, 0), pt(2, 1)]
    );
    expect(transform.obsMean).toBeCloseTo(50, 2);
    expect(transform.fcstMean).toBeCloseTo(0, 2);
    expect(transform.scale).toBeCloseTo(0.5, 2);
  });

  it("returns scale=1 when both have the same amplitude", () => {
    const transform = computeAffineTransform(
      [pt(0, 101), pt(1, 102), pt(2, 103)],
      [pt(0, 1), pt(1, 2), pt(2, 3)]
    );
    expect(transform.scale).toBeCloseTo(1.0, 2);
  });
});

// ---------------------------------------------------------------------------
// computeTideState
// ---------------------------------------------------------------------------

describe("computeTideState", () => {
  /**
   * Build a simple rise-fall-rise pattern over 24h to guarantee
   * at least one high and one low extreme.
   */
  function buildRiseFallPoints(): TidePoint[] {
    const pts: TidePoint[] = [];
    const base = new Date("2025-04-01T00:00:00Z").getTime();
    // Rise from 1→4 over 6h, fall from 4→1 over 6h, rise again 1→4
    for (let h = 0; h <= 6; h++) {
      pts.push(pt(h, 1 + (3 * h) / 6));
    }
    for (let h = 1; h <= 6; h++) {
      pts.push(pt(6 + h, 4 - (3 * h) / 6));
    }
    for (let h = 1; h <= 6; h++) {
      pts.push(pt(12 + h, 1 + (3 * h) / 6));
    }
    return pts;
  }

  it("returns a complete TideState object", () => {
    const points = buildRiseFallPoints();
    const state = computeTideState(points, new Date("2025-04-01T03:00:00Z"));

    expect(state).toHaveProperty("currentHeight");
    expect(state).toHaveProperty("direction");
    expect(state).toHaveProperty("nextHigh");
    expect(state).toHaveProperty("nextLow");
    expect(state).toHaveProperty("cycleProgress");
  });

  it("interpolates current height correctly", () => {
    const points = [pt(0, 1), pt(2, 3), pt(4, 1)];
    const state = computeTideState(points, new Date("2025-04-01T01:00:00Z"));
    expect(state.currentHeight).toBeCloseTo(2.0, 3);
  });

  it("detects rising direction during upward segment", () => {
    const points = buildRiseFallPoints();
    const state = computeTideState(points, new Date("2025-04-01T03:00:00Z"));
    expect(state.direction).toBe("rising");
  });

  it("detects falling direction during downward segment", () => {
    const points = buildRiseFallPoints();
    const state = computeTideState(points, new Date("2025-04-01T09:00:00Z"));
    expect(state.direction).toBe("falling");
  });

  it("returns 0 height for empty points array", () => {
    const state = computeTideState([], new Date());
    expect(state.currentHeight).toBe(0);
  });
});
