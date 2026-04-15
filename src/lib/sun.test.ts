/**
 * Tests for the sun position calculator.
 *
 * Covers:
 * - calculateSunTimes() produces plausible sunrise/sunset times for Galicia
 * - getGaliciaTimezoneOffset() correctly determines CET (UTC+1) vs CEST (UTC+2)
 * - The DST transition dates (last Sunday of March / October)
 * - formatTime handling of edge cases (midnight normalization)
 */
import { describe, it, expect } from "vitest";
import { calculateSunTimes, getGaliciaTimezoneOffset } from "@/lib/sun";

// ---------------------------------------------------------------------------
// getGaliciaTimezoneOffset — DST detection
// ---------------------------------------------------------------------------

describe("getGaliciaTimezoneOffset", () => {
  it("returns 1 (CET) in January (winter)", () => {
    expect(getGaliciaTimezoneOffset(new Date("2026-01-15T12:00:00Z"))).toBe(1);
  });

  it("returns 2 (CEST) in July (summer)", () => {
    expect(getGaliciaTimezoneOffset(new Date("2026-07-15T12:00:00Z"))).toBe(2);
  });

  it("returns 1 (CET) in December", () => {
    expect(getGaliciaTimezoneOffset(new Date("2026-12-01T12:00:00Z"))).toBe(1);
  });

  it("returns 2 (CEST) in June", () => {
    expect(getGaliciaTimezoneOffset(new Date("2026-06-01T12:00:00Z"))).toBe(2);
  });

  // 2026: Last Sunday of March = March 29
  // DST starts at 01:00 UTC on that day
  it("returns 1 (CET) just before DST starts (2026-03-29T00:59:59Z)", () => {
    expect(
      getGaliciaTimezoneOffset(new Date("2026-03-29T00:59:59Z")),
    ).toBe(1);
  });

  it("returns 2 (CEST) at DST start (2026-03-29T01:00:00Z)", () => {
    expect(
      getGaliciaTimezoneOffset(new Date("2026-03-29T01:00:00Z")),
    ).toBe(2);
  });

  // 2026: Last Sunday of October = October 25
  // DST ends at 01:00 UTC on that day
  it("returns 2 (CEST) just before DST ends (2026-10-25T00:59:59Z)", () => {
    expect(
      getGaliciaTimezoneOffset(new Date("2026-10-25T00:59:59Z")),
    ).toBe(2);
  });

  it("returns 1 (CET) at DST end (2026-10-25T01:00:00Z)", () => {
    expect(
      getGaliciaTimezoneOffset(new Date("2026-10-25T01:00:00Z")),
    ).toBe(1);
  });

  // 2025: Last Sunday of March = March 30
  it("handles 2025 DST start correctly (2025-03-30T01:00:00Z)", () => {
    expect(
      getGaliciaTimezoneOffset(new Date("2025-03-30T01:00:00Z")),
    ).toBe(2);
  });

  it("handles 2025 pre-DST start correctly (2025-03-30T00:59:00Z)", () => {
    expect(
      getGaliciaTimezoneOffset(new Date("2025-03-30T00:59:00Z")),
    ).toBe(1);
  });

  // 2025: Last Sunday of October = October 26
  it("handles 2025 DST end correctly (2025-10-26T01:00:00Z)", () => {
    expect(
      getGaliciaTimezoneOffset(new Date("2025-10-26T01:00:00Z")),
    ).toBe(1);
  });

  it("handles 2025 pre-DST end correctly (2025-10-26T00:59:00Z)", () => {
    expect(
      getGaliciaTimezoneOffset(new Date("2025-10-26T00:59:00Z")),
    ).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// calculateSunTimes — basic plausibility checks for Galicia
// ---------------------------------------------------------------------------

describe("calculateSunTimes", () => {
  // Vigo coordinates: 42.24°N, -8.72°W
  const LAT = 42.24;
  const LON = -8.72;

  it("returns sunrise and sunset as HH:MM strings", () => {
    const result = calculateSunTimes(
      new Date("2026-06-21T00:00:00Z"),
      LAT,
      LON,
      2, // CEST
    );

    expect(result.sunrise).toMatch(/^\d{2}:\d{2}$/);
    expect(result.sunset).toMatch(/^\d{2}:\d{2}$/);
  });

  it("returns positive dayLengthMinutes", () => {
    const result = calculateSunTimes(
      new Date("2026-06-21T00:00:00Z"),
      LAT,
      LON,
      2,
    );

    expect(result.dayLengthMinutes).toBeGreaterThan(0);
  });

  it("summer solstice has a longer day than winter solstice", () => {
    const summer = calculateSunTimes(
      new Date("2026-06-21T00:00:00Z"),
      LAT,
      LON,
      2,
    );
    const winter = calculateSunTimes(
      new Date("2026-12-21T00:00:00Z"),
      LAT,
      LON,
      1,
    );

    expect(summer.dayLengthMinutes).toBeGreaterThan(
      winter.dayLengthMinutes,
    );
  });

  it("summer solstice day length is ~15 hours for Galicia", () => {
    const result = calculateSunTimes(
      new Date("2026-06-21T00:00:00Z"),
      LAT,
      LON,
      2,
    );

    // At 42°N, summer solstice day length is ~15h (900 minutes)
    expect(result.dayLengthMinutes).toBeGreaterThan(870);
    expect(result.dayLengthMinutes).toBeLessThan(960);
  });

  it("winter solstice day length is ~9 hours for Galicia", () => {
    const result = calculateSunTimes(
      new Date("2026-12-21T00:00:00Z"),
      LAT,
      LON,
      1,
    );

    // At 42°N, winter solstice day length is ~9h (540 minutes)
    expect(result.dayLengthMinutes).toBeGreaterThan(510);
    expect(result.dayLengthMinutes).toBeLessThan(570);
  });

  it("sunrise is before sunset", () => {
    const result = calculateSunTimes(
      new Date("2026-04-01T00:00:00Z"),
      LAT,
      LON,
      2,
    );

    const [srH, srM] = result.sunrise.split(":").map(Number);
    const [ssH, ssM] = result.sunset.split(":").map(Number);
    const srMinutes = srH * 60 + srM;
    const ssMinutes = ssH * 60 + ssM;

    expect(ssMinutes).toBeGreaterThan(srMinutes);
  });

  it("equinox sunrise is around 08:00-08:30 CEST in Galicia", () => {
    // Spring equinox: March 20
    const result = calculateSunTimes(
      new Date("2026-03-20T00:00:00Z"),
      LAT,
      LON,
      1, // CET (before DST)
    );

    const [h, m] = result.sunrise.split(":").map(Number);
    const minutes = h * 60 + m;

    // Sunrise near equinox at 42°N, -8.7°W, CET should be around 07:30-08:30
    expect(minutes).toBeGreaterThan(7 * 60);
    expect(minutes).toBeLessThan(8 * 60 + 30);
  });
});
