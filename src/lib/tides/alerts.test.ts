/**
 * Tests for tide alert functions:
 * getLunarPhase, computeTideAlert.
 */
import { describe, it, expect } from "vitest";
import { getLunarPhase, computeTideAlert } from "@/lib/tides/alerts";
import type { TideExtreme } from "@/lib/tides/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a TideExtreme at a given hour offset from base with given type/height. */
function extreme(
  hourOffset: number,
  type: "high" | "low",
  height: number
): TideExtreme {
  const base = new Date("2026-04-01T00:00:00Z");
  return {
    time: new Date(base.getTime() + hourOffset * 3600_000).toISOString(),
    height,
    type,
  };
}

/** Build a set of extremes with a specific tidal range (maxHigh - minLow). */
function extremesWithRange(range: number): TideExtreme[] {
  const midLevel = 2.0;
  return [
    extreme(0, "high", midLevel + range / 2),
    extreme(6, "low", midLevel - range / 2),
    extreme(12, "high", midLevel + range / 2),
    extreme(18, "low", midLevel - range / 2),
  ];
}

// ---------------------------------------------------------------------------
// getLunarPhase
// ---------------------------------------------------------------------------

describe("getLunarPhase", () => {
  it("returns ~0 for a known new moon date", () => {
    // 2000-01-06 18:14 UTC is the reference new moon
    const phase = getLunarPhase(new Date(Date.UTC(2000, 0, 6, 18, 14, 0)));
    expect(phase).toBeCloseTo(0, 2);
  });

  it("returns ~0.5 for a full moon (~14.77 days after reference)", () => {
    const SYNODIC_MONTH_MS = 29.53058868 * 86_400_000;
    const refMs = Date.UTC(2000, 0, 6, 18, 14, 0);
    const fullMoon = new Date(refMs + SYNODIC_MONTH_MS * 0.5);
    const phase = getLunarPhase(fullMoon);
    expect(phase).toBeCloseTo(0.5, 2);
  });

  it("returns ~0.25 for first quarter moon", () => {
    const SYNODIC_MONTH_MS = 29.53058868 * 86_400_000;
    const refMs = Date.UTC(2000, 0, 6, 18, 14, 0);
    const quarter = new Date(refMs + SYNODIC_MONTH_MS * 0.25);
    const phase = getLunarPhase(quarter);
    expect(phase).toBeCloseTo(0.25, 2);
  });

  it("returns ~0.75 for last quarter moon", () => {
    const SYNODIC_MONTH_MS = 29.53058868 * 86_400_000;
    const refMs = Date.UTC(2000, 0, 6, 18, 14, 0);
    const lastQ = new Date(refMs + SYNODIC_MONTH_MS * 0.75);
    const phase = getLunarPhase(lastQ);
    expect(phase).toBeCloseTo(0.75, 2);
  });

  it("wraps correctly for dates many synodic months later", () => {
    // 100 synodic months after reference should return ~0
    // (floating-point drift may land near 0 or near 1, both represent new moon)
    const SYNODIC_MONTH_MS = 29.53058868 * 86_400_000;
    const refMs = Date.UTC(2000, 0, 6, 18, 14, 0);
    const future = new Date(refMs + SYNODIC_MONTH_MS * 100);
    const phase = getLunarPhase(future);
    // Phase near 0 or near 1 both indicate new moon
    const distFromNewMoon = Math.min(phase, 1 - phase);
    expect(distFromNewMoon).toBeLessThan(0.01);
  });

  it("returns a value in [0, 1) range", () => {
    // Test a few arbitrary dates
    const dates = [
      new Date("2025-06-15T12:00:00Z"),
      new Date("2026-01-01T00:00:00Z"),
      new Date("2024-12-25T18:00:00Z"),
    ];
    for (const d of dates) {
      const phase = getLunarPhase(d);
      expect(phase).toBeGreaterThanOrEqual(0);
      expect(phase).toBeLessThan(1);
    }
  });
});

// ---------------------------------------------------------------------------
// computeTideAlert
// ---------------------------------------------------------------------------

describe("computeTideAlert", () => {
  // Use exact dates relative to the reference new moon
  const SYNODIC_MONTH_MS = 29.53058868 * 86_400_000;
  const REF_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14, 0);

  /** Create a date at a specific lunar phase (0 = new, 0.5 = full). */
  function dateAtPhase(phase: number): Date {
    return new Date(REF_NEW_MOON_MS + SYNODIC_MONTH_MS * phase);
  }

  describe("spring tide (mareas vivas)", () => {
    it("returns high-severity alert near new moon with large tidal range (>3m)", () => {
      const date = dateAtPhase(0.02); // very close to new moon
      const extremes = extremesWithRange(3.5);
      const alert = computeTideAlert(extremes, date);

      expect(alert).not.toBeNull();
      expect(alert!.title).toBe("Mareas vivas");
      expect(alert!.severity).toBe("high");
      expect(alert!.icon).toBe("notifications_active");
      expect(alert!.message).toContain("luna nueva");
      expect(alert!.message).toContain("3.5m");
    });

    it("returns high-severity alert near full moon with large tidal range (>3m)", () => {
      const date = dateAtPhase(0.52); // very close to full moon
      const extremes = extremesWithRange(4.0);
      const alert = computeTideAlert(extremes, date);

      expect(alert).not.toBeNull();
      expect(alert!.title).toBe("Mareas vivas");
      expect(alert!.severity).toBe("high");
      expect(alert!.message).toContain("luna llena");
      expect(alert!.message).toContain("4.0m");
    });

    it("returns moderate-severity alert near new moon with small tidal range (<=3m)", () => {
      const date = dateAtPhase(0.05); // near new moon
      const extremes = extremesWithRange(2.5);
      const alert = computeTideAlert(extremes, date);

      expect(alert).not.toBeNull();
      expect(alert!.title).toBe("Mareas vivas");
      expect(alert!.severity).toBe("moderate");
      expect(alert!.message).toContain("luna nueva");
    });

    it("returns moderate-severity alert near full moon with small tidal range (<=3m)", () => {
      const date = dateAtPhase(0.48); // near full moon
      const extremes = extremesWithRange(2.0);
      const alert = computeTideAlert(extremes, date);

      expect(alert).not.toBeNull();
      expect(alert!.title).toBe("Mareas vivas");
      expect(alert!.severity).toBe("moderate");
      expect(alert!.message).toContain("luna llena");
    });

    it("detects spring tide at phase > 0.9 (approaching new moon)", () => {
      const date = dateAtPhase(0.95); // near next new moon
      const extremes = extremesWithRange(2.0);
      const alert = computeTideAlert(extremes, date);

      expect(alert).not.toBeNull();
      expect(alert!.title).toBe("Mareas vivas");
      expect(alert!.message).toContain("luna nueva");
    });
  });

  describe("neap tide (mareas muertas)", () => {
    it("returns info alert near first quarter moon (phase ~0.25)", () => {
      const date = dateAtPhase(0.25);
      const extremes = extremesWithRange(1.5);
      const alert = computeTideAlert(extremes, date);

      expect(alert).not.toBeNull();
      expect(alert!.title).toBe("Mareas muertas");
      expect(alert!.severity).toBe("info");
      expect(alert!.icon).toBe("wb_twilight");
      expect(alert!.message).toContain("cuarto lunar");
      expect(alert!.message).toContain("1.5m");
    });

    it("returns info alert near last quarter moon (phase ~0.75)", () => {
      const date = dateAtPhase(0.76);
      const extremes = extremesWithRange(1.2);
      const alert = computeTideAlert(extremes, date);

      expect(alert).not.toBeNull();
      expect(alert!.title).toBe("Mareas muertas");
      expect(alert!.severity).toBe("info");
    });
  });

  describe("no alert (transitional phase)", () => {
    it("returns null at mid-phase between spring and neap (~0.15)", () => {
      const date = dateAtPhase(0.15);
      const extremes = extremesWithRange(2.0);
      const alert = computeTideAlert(extremes, date);

      expect(alert).toBeNull();
    });

    it("returns null at mid-phase between neap and spring (~0.37)", () => {
      const date = dateAtPhase(0.37);
      const extremes = extremesWithRange(2.0);
      const alert = computeTideAlert(extremes, date);

      expect(alert).toBeNull();
    });

    it("returns null at mid-phase ~0.65", () => {
      const date = dateAtPhase(0.65);
      const extremes = extremesWithRange(2.0);
      const alert = computeTideAlert(extremes, date);

      expect(alert).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("returns null when extremes array is empty", () => {
      const date = dateAtPhase(0.0); // new moon
      const alert = computeTideAlert([], date);

      // Empty extremes → tidalRange = 0, so moderate spring alert
      expect(alert).not.toBeNull();
      expect(alert!.severity).toBe("moderate");
    });

    it("handles extremes with only highs (no lows)", () => {
      const date = dateAtPhase(0.0);
      const extremes = [extreme(0, "high", 4.0), extreme(12, "high", 3.8)];
      const alert = computeTideAlert(extremes, date);

      // minLow = 0 (no lows), maxHigh = 4.0, range = 4.0 > 3.0 → high severity
      expect(alert).not.toBeNull();
      expect(alert!.severity).toBe("high");
    });

    it("handles extremes with only lows (no highs)", () => {
      const date = dateAtPhase(0.0);
      const extremes = [extreme(0, "low", 0.5), extreme(12, "low", 0.3)];
      const alert = computeTideAlert(extremes, date);

      // maxHigh = 0 (no highs), minLow = 0.3, range = -0.3 < 3.0 → moderate
      expect(alert).not.toBeNull();
      expect(alert!.severity).toBe("moderate");
    });

    it("uses exactly 3.0m as the threshold boundary (range = 3.0 → moderate, not high)", () => {
      const date = dateAtPhase(0.0); // new moon
      const extremes = extremesWithRange(3.0); // exactly at boundary
      const alert = computeTideAlert(extremes, date);

      // tidalRange = 3.0, condition is > 3.0, so should be moderate
      expect(alert).not.toBeNull();
      expect(alert!.severity).toBe("moderate");
    });

    it("range just above 3.0m yields high severity", () => {
      const date = dateAtPhase(0.0);
      const extremes = extremesWithRange(3.01);
      const alert = computeTideAlert(extremes, date);

      expect(alert).not.toBeNull();
      expect(alert!.severity).toBe("high");
    });
  });
});
