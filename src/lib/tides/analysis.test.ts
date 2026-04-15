/**
 * Tests for tide analysis functions:
 * findExtremes, findNextHigh, findNextLow, getTideDirection, computeCycleProgress.
 */
import { describe, it, expect } from "vitest";
import {
  findExtremes,
  findNextHigh,
  findNextLow,
  getTideDirection,
  computeCycleProgress,
} from "@/lib/tides/analysis";
import type { TidePoint, TideExtreme } from "@/lib/tides/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a TidePoint at a given hour offset from a fixed base date. */
function pt(hourOffset: number, height: number): TidePoint {
  const base = new Date("2025-04-01T00:00:00Z");
  return {
    time: new Date(base.getTime() + hourOffset * 3600_000).toISOString(),
    height,
  };
}

/**
 * Generate a synthetic semi-diurnal tide (~12h24m period).
 * Returns points every 15 minutes for 24 hours.
 */
function syntheticTide24h(): TidePoint[] {
  const points: TidePoint[] = [];
  const base = new Date("2025-04-01T00:00:00Z").getTime();
  const periodMs = 12.4 * 3600_000; // ~12h24m
  const amplitude = 1.5; // meters
  const offset = 3.0; // datum offset

  // 96 points = 24h at 15-min intervals
  for (let i = 0; i < 96; i++) {
    const t = base + i * 15 * 60_000;
    const height =
      offset + amplitude * Math.cos((2 * Math.PI * (t - base)) / periodMs);
    points.push({
      time: new Date(t).toISOString(),
      height: Math.round(height * 1000) / 1000,
    });
  }
  return points;
}

// ---------------------------------------------------------------------------
// findExtremes
// ---------------------------------------------------------------------------

describe("findExtremes", () => {
  it("returns empty for fewer than 3 points", () => {
    expect(findExtremes([])).toEqual([]);
    expect(findExtremes([pt(0, 1)])).toEqual([]);
    expect(findExtremes([pt(0, 1), pt(1, 2)])).toEqual([]);
  });

  it("detects a single peak between two valleys", () => {
    const points = [pt(0, 1), pt(6, 4), pt(12, 1)];
    const extremes = findExtremes(points);
    expect(extremes.length).toBeGreaterThanOrEqual(1);
    const high = extremes.find((e) => e.type === "high");
    expect(high).toBeDefined();
    expect(high!.height).toBe(4);
  });

  it("detects a single trough between two peaks", () => {
    const points = [pt(0, 4), pt(6, 1), pt(12, 4)];
    const extremes = findExtremes(points);
    const low = extremes.find((e) => e.type === "low");
    expect(low).toBeDefined();
    expect(low!.height).toBe(1);
  });

  it("detects multiple extremes from a synthetic 24h tide", () => {
    const points = syntheticTide24h();
    const extremes = findExtremes(points);

    // 24h with ~12.4h period → expect 2 highs and 1-2 lows
    const highs = extremes.filter((e) => e.type === "high");
    const lows = extremes.filter((e) => e.type === "low");
    expect(highs.length).toBeGreaterThanOrEqual(1);
    expect(lows.length).toBeGreaterThanOrEqual(1);

    // Alternating pattern: no two consecutive same-type extremes
    for (let i = 1; i < extremes.length; i++) {
      expect(extremes[i].type).not.toBe(extremes[i - 1].type);
    }
  });

  it("filters out noise below MIN_AMPLITUDE", () => {
    // Tiny oscillation that shouldn't register
    const points = [
      pt(0, 3.0),
      pt(5, 3.05), // "high" but only 0.05m diff
      pt(10, 3.0),
      pt(15, 3.05),
      pt(20, 3.0),
    ];
    const extremes = findExtremes(points);
    // The amplitude is only 0.05m which is below 0.15m threshold
    // After the first extreme, subsequent ones should be filtered
    expect(extremes.length).toBeLessThanOrEqual(1);
  });

  it("respects minimum interval between extremes", () => {
    const extremes = findExtremes(syntheticTide24h());
    for (let i = 1; i < extremes.length; i++) {
      const dt =
        new Date(extremes[i].time).getTime() -
        new Date(extremes[i - 1].time).getTime();
      expect(dt).toBeGreaterThanOrEqual(4 * 3600_000);
    }
  });
});

// ---------------------------------------------------------------------------
// findNextHigh / findNextLow
// ---------------------------------------------------------------------------

describe("findNextHigh / findNextLow", () => {
  const extremes: TideExtreme[] = [
    { time: "2025-04-01T00:00:00Z", height: 4.5, type: "high" },
    { time: "2025-04-01T06:12:00Z", height: 1.5, type: "low" },
    { time: "2025-04-01T12:24:00Z", height: 4.3, type: "high" },
    { time: "2025-04-01T18:36:00Z", height: 1.7, type: "low" },
  ];

  it("finds the next high tide after a given time", () => {
    const result = findNextHigh(extremes, new Date("2025-04-01T01:00:00Z"));
    expect(result).not.toBeNull();
    expect(result!.type).toBe("high");
    expect(result!.time).toBe("2025-04-01T12:24:00Z");
  });

  it("finds the next low tide after a given time", () => {
    const result = findNextLow(extremes, new Date("2025-04-01T01:00:00Z"));
    expect(result).not.toBeNull();
    expect(result!.type).toBe("low");
    expect(result!.time).toBe("2025-04-01T06:12:00Z");
  });

  it("returns null when no future high exists", () => {
    const result = findNextHigh(extremes, new Date("2025-04-01T20:00:00Z"));
    expect(result).toBeNull();
  });

  it("returns null when no future low exists", () => {
    const result = findNextLow(extremes, new Date("2025-04-01T20:00:00Z"));
    expect(result).toBeNull();
  });

  it("returns null for empty extremes", () => {
    expect(findNextHigh([], new Date())).toBeNull();
    expect(findNextLow([], new Date())).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getTideDirection
// ---------------------------------------------------------------------------

describe("getTideDirection", () => {
  it("returns 'rising' when bracketing points go up", () => {
    const points = [pt(0, 1), pt(2, 2), pt(4, 3)];
    const at = new Date("2025-04-01T01:00:00Z"); // between pt(0) and pt(2)
    expect(getTideDirection(points, at)).toBe("rising");
  });

  it("returns 'falling' when bracketing points go down", () => {
    const points = [pt(0, 3), pt(2, 2), pt(4, 1)];
    const at = new Date("2025-04-01T01:00:00Z");
    expect(getTideDirection(points, at)).toBe("falling");
  });

  it("falls back to last two points when time is past all data", () => {
    const points = [pt(0, 1), pt(2, 3)];
    const at = new Date("2025-04-01T10:00:00Z"); // well past all points
    expect(getTideDirection(points, at)).toBe("rising");
  });

  it("defaults to 'rising' with fewer than 2 points", () => {
    expect(getTideDirection([pt(0, 5)], new Date())).toBe("rising");
    expect(getTideDirection([], new Date())).toBe("rising");
  });
});

// ---------------------------------------------------------------------------
// computeCycleProgress
// ---------------------------------------------------------------------------

describe("computeCycleProgress", () => {
  const extremes: TideExtreme[] = [
    { time: "2025-04-01T00:00:00Z", height: 4.5, type: "high" },
    { time: "2025-04-01T06:00:00Z", height: 1.5, type: "low" },
  ];

  it("returns 0% at the start of a cycle", () => {
    const progress = computeCycleProgress(
      extremes,
      new Date("2025-04-01T00:00:00Z")
    );
    expect(progress).toBe(0);
  });

  it("returns 50% at midpoint of a cycle", () => {
    const progress = computeCycleProgress(
      extremes,
      new Date("2025-04-01T03:00:00Z")
    );
    expect(progress).toBe(50);
  });

  it("returns ~100% near the end of a cycle", () => {
    const progress = computeCycleProgress(
      extremes,
      new Date("2025-04-01T05:54:00Z") // 5h54m of 6h
    );
    expect(progress).toBeGreaterThanOrEqual(98);
  });

  it("returns 50 when there is no previous extreme", () => {
    const progress = computeCycleProgress(
      extremes,
      new Date("2024-01-01T00:00:00Z") // before all
    );
    expect(progress).toBe(50);
  });

  it("returns 50 when there is no next extreme", () => {
    const progress = computeCycleProgress(
      extremes,
      new Date("2025-04-02T00:00:00Z") // after all
    );
    expect(progress).toBe(50);
  });

  it("returns 50 for empty extremes", () => {
    expect(computeCycleProgress([], new Date())).toBe(50);
  });
});
