import { NextRequest, NextResponse } from "next/server";
import { getStation, getDefaultStation } from "@/lib/stations";
import { fetchObservations } from "@/lib/thredds/puertos";
import { findExtremes } from "@/lib/tides/analysis";
import { computeTideState } from "@/lib/tides/interpolation";

/**
 * GET /api/tides/observations?station=vigo&date=2026-03-29
 *
 * Fetches tide gauge observations from Puertos del Estado THREDDS.
 * Returns 15-minute resolution tide data with computed extremes and state.
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

  try {
    const points = await fetchObservations(station, date);
    const extremes = findExtremes(points);
    const state = computeTideState(points, new Date());

    return NextResponse.json(
      {
        station: station.id,
        date: date.toISOString().split("T")[0],
        points,
        extremes,
        state,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
        },
      }
    );
  } catch (error) {
    console.error(`Failed to fetch observations for ${station.id}:`, error);

    return NextResponse.json(
      {
        error: "Failed to fetch tide observations",
        detail: error instanceof Error ? error.message : "Unknown error",
        station: station.id,
      },
      { status: 502 }
    );
  }
}
