/**
 * Tide height interpolation.
 *
 * Interpolates the current tide height from discrete time-series points
 * using linear interpolation.
 */

import type { TidePoint, TideState, TideExtreme } from "./types";
import {
  findExtremes,
  findNextHigh,
  findNextLow,
  getTideDirection,
  computeCycleProgress,
} from "./analysis";

/**
 * Linearly interpolate the tide height at a given time
 * from a sorted array of TidePoints.
 */
export function interpolateHeight(
  points: TidePoint[],
  time: Date
): number | null {
  if (points.length === 0) return null;

  const targetMs = time.getTime();

  // Before first point
  if (targetMs <= new Date(points[0].time).getTime()) {
    return points[0].height;
  }

  // After last point
  if (targetMs >= new Date(points[points.length - 1].time).getTime()) {
    return points[points.length - 1].height;
  }

  // Find bracketing points
  for (let i = 0; i < points.length - 1; i++) {
    const t1 = new Date(points[i].time).getTime();
    const t2 = new Date(points[i + 1].time).getTime();

    if (targetMs >= t1 && targetMs <= t2) {
      const h1 = points[i].height;
      const h2 = points[i + 1].height;
      // Guard against duplicate timestamps (t2 === t1) — return the first point's height
      if (t2 === t1) return h1;
      // Linear interpolation
      const fraction = (targetMs - t1) / (t2 - t1);
      return Math.round((h1 + fraction * (h2 - h1)) * 1000) / 1000;
    }
  }

  return null;
}

/**
 * Compute the full current tide state from a set of points.
 *
 * @param points - Time-series data (observations or forecast)
 * @param currentTime - The time to evaluate at
 * @returns TideState with current height, direction, next extremes, and cycle progress
 */
export function computeTideState(
  points: TidePoint[],
  currentTime: Date
): TideState {
  const currentHeight = interpolateHeight(points, currentTime) ?? 0;
  const extremes = findExtremes(points);
  const direction = getTideDirection(points, currentTime);
  const nextHigh = findNextHigh(extremes, currentTime);
  const nextLow = findNextLow(extremes, currentTime);
  const cycleProgress = computeCycleProgress(extremes, currentTime);

  return {
    currentHeight,
    direction,
    nextHigh,
    nextLow,
    cycleProgress,
  };
}

/**
 * Merge observations and forecast data into a single time series.
 * Observations take priority when both are available for the same time window.
 * Forecast data fills in for future periods.
 *
 * **Datum alignment**: Observations from Puertos del Estado SLEV are measured
 * relative to chart datum (CD), while MOHID/ROMS forecasts output sea surface
 * elevation relative to mean sea level (MSL). The two sources also differ in
 * amplitude — numerical models typically underestimate tidal range compared
 * to real observations. When both sources have overlapping time windows, this
 * function performs an affine transform (shift + scale) so that observations
 * are brought into the same datum *and* amplitude as the forecast.
 *
 * **Phase blending**: Numerical models often have small timing errors in tidal
 * phase compared to real observations. A hard cut from obs→forecast would
 * create an impossible discontinuity (e.g. 2m jump in 15 minutes). To avoid
 * this, we apply a linear crossfade over the last BLEND_HOURS of the overlap:
 * early in the blend zone we trust observations fully; at the end we trust
 * the forecast fully. This ensures a smooth visual transition.
 *
 * If there is no overlap (e.g. only one source), the function normalizes
 * observations to zero-mean as a best-effort approximation.
 */

/** Duration of the obs→forecast crossfade window in hours. */
const BLEND_HOURS = 3;

export function mergeTimeSeries(
  observations: TidePoint[],
  forecast: TidePoint[]
): TidePoint[] {
  if (observations.length === 0) return forecast;
  if (forecast.length === 0) {
    // No forecast to align against — normalize observations to zero-mean
    return normalizeSeries(observations);
  }

  const transform = computeAffineTransform(observations, forecast);

  // Helper: normalize a single observation height
  const normalize = (h: number) =>
    Math.round(
      ((h - transform.obsMean) * transform.scale + transform.fcstMean) * 1000
    ) / 1000;

  // Determine overlap boundaries
  const obsEnd = new Date(
    observations[observations.length - 1].time
  ).getTime();
  const fcstStart = new Date(forecast[0].time).getTime();

  // Blend zone: last BLEND_HOURS of the overlap, ending at obsEnd
  const blendMs = BLEND_HOURS * 3600_000;
  const overlapEnd = Math.min(obsEnd, new Date(forecast[forecast.length - 1].time).getTime());
  const overlapStart = Math.max(
    new Date(observations[0].time).getTime(),
    fcstStart
  );
  const hasOverlap = overlapEnd > overlapStart;

  // Blend zone starts this many ms before the end of observations
  const blendStart = hasOverlap
    ? Math.max(overlapStart, obsEnd - blendMs)
    : obsEnd; // no blend if no overlap

  // Build a time→forecast height lookup for fast interpolation during blending
  const fcstByTime = new Map<number, number>();
  for (const fp of forecast) {
    fcstByTime.set(new Date(fp.time).getTime(), fp.height);
  }

  // Interpolate forecast height at an arbitrary time
  function interpolateFcst(timeMs: number): number | null {
    // Find bracketing forecast points
    for (let i = 0; i < forecast.length - 1; i++) {
      const t0 = new Date(forecast[i].time).getTime();
      const t1 = new Date(forecast[i + 1].time).getTime();
      if (timeMs >= t0 && timeMs <= t1) {
        const frac = t1 !== t0 ? (timeMs - t0) / (t1 - t0) : 0;
        return forecast[i].height + frac * (forecast[i + 1].height - forecast[i].height);
      }
    }
    return null;
  }

  const merged: TidePoint[] = [];

  // Phase 1: normalized observations, with crossfade blending near the end
  for (const p of observations) {
    const t = new Date(p.time).getTime();
    const normH = normalize(p.height);

    if (!hasOverlap || t < blendStart) {
      // Pure observation zone — use normalized obs
      merged.push({ time: p.time, height: normH });
    } else {
      // Blend zone — crossfade from obs to forecast
      // Guard against zero-width blend zone (obsEnd === blendStart)
      const blendDenom = obsEnd - blendStart;
      const blendFrac = blendDenom > 0 ? (t - blendStart) / blendDenom : 1; // 0→1
      const fcstH = interpolateFcst(t);
      if (fcstH !== null) {
        const blended =
          Math.round((normH * (1 - blendFrac) + fcstH * blendFrac) * 1000) /
          1000;
        merged.push({ time: p.time, height: blended });
      } else {
        // Forecast doesn't cover this time — use pure obs
        merged.push({ time: p.time, height: normH });
      }
    }
  }

  // Phase 2: append forecast points after the last observation
  const lastObsTime = new Date(
    observations[observations.length - 1].time
  ).getTime();
  for (const fp of forecast) {
    if (new Date(fp.time).getTime() > lastObsTime) {
      merged.push(fp);
    }
  }

  return merged;
}

/**
 * Normalize a time series to zero-mean (subtract the series mean).
 * Used when there is no forecast reference for datum alignment.
 */
function normalizeSeries(points: TidePoint[]): TidePoint[] {
  if (points.length === 0) return points;
  const mean =
    points.reduce((sum, p) => sum + p.height, 0) / points.length;
  return points.map((p) => ({
    time: p.time,
    height: Math.round((p.height - mean) * 1000) / 1000,
  }));
}

/** Helper: compute standard deviation from an array of numbers. */
function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance =
    values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Affine transform parameters to convert observations into the forecast's
 * datum and amplitude space.
 *
 * Usage: `normalized = (obs - obsMean) * scale + fcstMean`
 */
export interface AffineTransform {
  obsMean: number;
  fcstMean: number;
  /** Ratio of forecast stddev to observation stddev (amplitude scaling).
   *  Falls back to 1.0 if either stddev is near-zero. */
  scale: number;
}

/**
 * Compute the affine transform (shift + scale) between observations and forecast.
 * Used to normalize observation heights so they visually match the forecast
 * in both baseline and amplitude.
 *
 * When there is overlap between the two series, statistics are computed from
 * the overlapping window. When there is no overlap, observation mean is used
 * as the offset and scale defaults to 1.0.
 */
export function computeAffineTransform(
  observations: TidePoint[],
  forecast: TidePoint[]
): AffineTransform {
  if (observations.length === 0) {
    return { obsMean: 0, fcstMean: 0, scale: 1 };
  }
  if (forecast.length === 0) {
    const obsMean =
      observations.reduce((sum, p) => sum + p.height, 0) /
      observations.length;
    return { obsMean, fcstMean: 0, scale: 1 };
  }

  const obsStart = new Date(observations[0].time).getTime();
  const obsEnd = new Date(observations[observations.length - 1].time).getTime();
  const fcstStart = new Date(forecast[0].time).getTime();
  const fcstEnd = new Date(forecast[forecast.length - 1].time).getTime();

  const overlapStart = Math.max(obsStart, fcstStart);
  const overlapEnd = Math.min(obsEnd, fcstEnd);

  if (overlapEnd > overlapStart) {
    const obsInOverlap = observations.filter((p) => {
      const t = new Date(p.time).getTime();
      return t >= overlapStart && t <= overlapEnd;
    });
    const fcstInOverlap = forecast.filter((p) => {
      const t = new Date(p.time).getTime();
      return t >= overlapStart && t <= overlapEnd;
    });

    if (obsInOverlap.length > 0 && fcstInOverlap.length > 0) {
      const obsMean =
        obsInOverlap.reduce((sum, p) => sum + p.height, 0) /
        obsInOverlap.length;
      const fcstMean =
        fcstInOverlap.reduce((sum, p) => sum + p.height, 0) /
        fcstInOverlap.length;

      const obsSD = stdDev(obsInOverlap.map((p) => p.height));
      const fcstSD = stdDev(fcstInOverlap.map((p) => p.height));

      // Only scale if both stddevs are meaningful (> 5cm)
      const scale = obsSD > 0.05 && fcstSD > 0.05 ? fcstSD / obsSD : 1;

      return { obsMean, fcstMean, scale };
    }
  }

  // No overlap — use observation mean, no scaling
  const obsMean =
    observations.reduce((sum, p) => sum + p.height, 0) /
    observations.length;
  return { obsMean, fcstMean: 0, scale: 1 };
}

/**
 * Compute the datum offset between observations (chart datum) and forecast (MSL).
 * Used by the combined API route to normalize obsPoints independently.
 *
 * @deprecated Use `computeAffineTransform` instead for proper shift+scale alignment.
 * This function is kept for backward compatibility but now delegates to the
 * affine transform.
 */
export function computeDatumOffset(
  observations: TidePoint[],
  forecast: TidePoint[]
): number {
  // For backward compat: return the mean shift only.
  // The combined route should migrate to computeAffineTransform.
  const transform = computeAffineTransform(observations, forecast);
  return transform.obsMean - transform.fcstMean;
}
