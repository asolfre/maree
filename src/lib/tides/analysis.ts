/**
 * Tide analysis utilities.
 *
 * Computes high/low tide extremes from a time series of tide points
 * using local extrema detection with smoothing.
 */

import type { TidePoint, TideExtreme } from "./types";

/**
 * Minimum time between detected extremes (in milliseconds).
 * Tidal cycles are typically ~6h12m, so extremes should be at least 4h apart.
 */
const MIN_EXTREME_INTERVAL_MS = 4 * 60 * 60 * 1000;

/**
 * Minimum height difference to qualify as a real extreme (meters).
 * Filters out noise from very small oscillations.
 */
const MIN_AMPLITUDE = 0.15;

/**
 * Detect high and low tide extremes from a time series.
 *
 * Uses a simple local extrema algorithm:
 * 1. Find points where the derivative changes sign
 * 2. Filter by minimum interval and amplitude
 * 3. Classify as high or low based on comparison with neighbors
 */
export function findExtremes(points: TidePoint[]): TideExtreme[] {
  if (points.length < 3) return [];

  const candidates: TideExtreme[] = [];

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1].height;
    const curr = points[i].height;
    const next = points[i + 1].height;

    // Local maximum
    if (curr > prev && curr >= next) {
      candidates.push({
        time: points[i].time,
        height: curr,
        type: "high",
      });
    }
    // Local minimum
    else if (curr < prev && curr <= next) {
      candidates.push({
        time: points[i].time,
        height: curr,
        type: "low",
      });
    }
  }

  // Filter by minimum interval and amplitude
  const filtered: TideExtreme[] = [];

  for (const candidate of candidates) {
    const lastExtreme = filtered[filtered.length - 1];

    if (!lastExtreme) {
      filtered.push(candidate);
      continue;
    }

    const timeDiff =
      new Date(candidate.time).getTime() - new Date(lastExtreme.time).getTime();
    const heightDiff = Math.abs(candidate.height - lastExtreme.height);

    if (timeDiff >= MIN_EXTREME_INTERVAL_MS && heightDiff >= MIN_AMPLITUDE) {
      // Only add if it's a different type than the last extreme
      if (candidate.type !== lastExtreme.type) {
        filtered.push(candidate);
      } else {
        // Same type: keep the more extreme one
        if (
          (candidate.type === "high" && candidate.height > lastExtreme.height) ||
          (candidate.type === "low" && candidate.height < lastExtreme.height)
        ) {
          filtered[filtered.length - 1] = candidate;
        }
      }
    } else if (timeDiff < MIN_EXTREME_INTERVAL_MS) {
      // Too close together: keep the more extreme one if same type
      if (candidate.type === lastExtreme.type) {
        if (
          (candidate.type === "high" && candidate.height > lastExtreme.height) ||
          (candidate.type === "low" && candidate.height < lastExtreme.height)
        ) {
          filtered[filtered.length - 1] = candidate;
        }
      }
    }
  }

  return filtered;
}

/**
 * Find the next high tide after the given time.
 */
export function findNextHigh(
  extremes: TideExtreme[],
  after: Date
): TideExtreme | null {
  const afterMs = after.getTime();
  return (
    extremes.find(
      (e) => e.type === "high" && new Date(e.time).getTime() > afterMs
    ) ?? null
  );
}

/**
 * Find the next low tide after the given time.
 */
export function findNextLow(
  extremes: TideExtreme[],
  after: Date
): TideExtreme | null {
  const afterMs = after.getTime();
  return (
    extremes.find(
      (e) => e.type === "low" && new Date(e.time).getTime() > afterMs
    ) ?? null
  );
}

/**
 * Determine the current tide direction (rising or falling)
 * based on surrounding points.
 */
export function getTideDirection(
  points: TidePoint[],
  currentTime: Date
): "rising" | "falling" {
  const now = currentTime.getTime();

  // Find the two points that bracket the current time
  let before: TidePoint | null = null;
  let after: TidePoint | null = null;

  for (let i = 0; i < points.length - 1; i++) {
    const t1 = new Date(points[i].time).getTime();
    const t2 = new Date(points[i + 1].time).getTime();
    if (t1 <= now && t2 >= now) {
      before = points[i];
      after = points[i + 1];
      break;
    }
  }

  if (before && after) {
    return after.height > before.height ? "rising" : "falling";
  }

  // Fallback: compare last two points
  if (points.length >= 2) {
    const last = points[points.length - 1];
    const secondLast = points[points.length - 2];
    return last.height > secondLast.height ? "rising" : "falling";
  }

  return "rising";
}

/**
 * Compute the cycle progress (0-100) between the last extreme and next extreme.
 */
export function computeCycleProgress(
  extremes: TideExtreme[],
  currentTime: Date
): number {
  const now = currentTime.getTime();

  let lastExtreme: TideExtreme | null = null;
  let nextExtreme: TideExtreme | null = null;

  for (let i = 0; i < extremes.length; i++) {
    const t = new Date(extremes[i].time).getTime();
    if (t <= now) {
      lastExtreme = extremes[i];
    } else if (t > now && !nextExtreme) {
      nextExtreme = extremes[i];
    }
  }

  if (!lastExtreme || !nextExtreme) return 50;

  const totalMs =
    new Date(nextExtreme.time).getTime() - new Date(lastExtreme.time).getTime();
  const elapsedMs = now - new Date(lastExtreme.time).getTime();

  if (totalMs <= 0) return 50;

  return Math.round((elapsedMs / totalMs) * 100);
}
