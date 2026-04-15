import { NextRequest, NextResponse } from "next/server";
import { getStation, getDefaultStation } from "@/lib/stations";
import { fetchObservations } from "@/lib/thredds/puertos";
import { fetchForecast } from "@/lib/thredds/meteogalicia";
import { findExtremes } from "@/lib/tides/analysis";
import { computeTideState, mergeTimeSeries, computeAffineTransform } from "@/lib/tides/interpolation";
import type { TidePoint } from "@/lib/tides/types";

/**
 * GET /api/tides/combined?station=vigo&date=2026-03-31
 *
 * Fetches both observations and forecast, merges them into a single
 * time series, and computes TideState from the combined data.
 *
 * This ensures nextHigh/nextLow are always populated: observations
 * provide the past/present, and forecast provides the future extremes.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const stationId = searchParams.get("station");
  const dateStr = searchParams.get("date");

  const station = stationId ? getStation(stationId) : getDefaultStation();
  if (!station) {
    return NextResponse.json(
      { error: `Unknown station: ${stationId}` },
      { status: 404 }
    );
  }

  const date = dateStr ? new Date(dateStr + "T00:00:00Z") : new Date();
  if (isNaN(date.getTime())) {
    return NextResponse.json(
      { error: `Invalid date format: ${dateStr}` },
      { status: 400 }
    );
  }

  let obsPoints: TidePoint[] = [];
  let fcstPoints: TidePoint[] = [];
  let isLive = false;

  // Fetch observations and forecast in parallel — neither is fatal if it fails
  const [obsResult, fcstResult] = await Promise.allSettled([
    fetchObservations(station, date),
    fetchForecast(station),
  ]);

  if (obsResult.status === "fulfilled") {
    obsPoints = obsResult.value;
    isLive = obsPoints.length > 0;
  } else {
    console.warn(
      `Observations failed for ${station.id}:`,
      obsResult.reason instanceof Error
        ? obsResult.reason.message
        : obsResult.reason
    );
  }

  if (fcstResult.status === "fulfilled") {
    fcstPoints = fcstResult.value;
  } else {
    console.warn(
      `Forecast failed for ${station.id}:`,
      fcstResult.reason instanceof Error
        ? fcstResult.reason.message
        : fcstResult.reason
    );
  }

  // If both failed, return an error
  if (obsPoints.length === 0 && fcstPoints.length === 0) {
    return NextResponse.json(
      { error: "Failed to fetch both observations and forecast" },
      { status: 502 }
    );
  }

  try {
    // Merge: observations take priority, forecast fills in the future.
    // mergeTimeSeries handles datum alignment (chart datum → MSL).
    const mergedPoints = mergeTimeSeries(obsPoints, fcstPoints);
    const mergedExtremes = findExtremes(mergedPoints);

    // Compute the affine transform so we can return normalized obsPoints
    // for independent chart styling (obs vs forecast visual distinction).
    const transform = computeAffineTransform(obsPoints, fcstPoints);
    const normalizedObsPoints: TidePoint[] = obsPoints.map((p) => ({
      time: p.time,
      height:
        Math.round(
          ((p.height - transform.obsMean) * transform.scale + transform.fcstMean) *
            1000
        ) / 1000,
    }));

    // Compute state from merged data so nextHigh/nextLow see forecast extremes
    const now = new Date();
    const state = computeTideState(mergedPoints, now);

    return NextResponse.json(
      {
        station: station.id,
        date: date.toISOString().split("T")[0],
        isLive,
        /** Observation points only, datum-normalized (for chart "observed" styling) */
        obsPoints: normalizedObsPoints,
        /** Forecast points only (for chart "forecast" styling) */
        fcstPoints,
        /** Merged time series (observations + forecast continuation) */
        points: mergedPoints,
        extremes: mergedExtremes,
        state,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
        },
      }
    );
  } catch (error) {
    console.error(`Error processing tide data for ${station.id}:`, error);
    return NextResponse.json(
      {
        error: "Failed to process tide data",
        station: station.id,
      },
      { status: 500 }
    );
  }
}
