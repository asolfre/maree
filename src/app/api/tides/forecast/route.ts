import { NextRequest, NextResponse } from "next/server";
import { getStation, getDefaultStation } from "@/lib/stations";
import { fetchExtendedForecast } from "@/lib/thredds/meteogalicia";
import { findExtremes } from "@/lib/tides/analysis";

/**
 * GET /api/tides/forecast?station=vigo
 *
 * Fetches extended tide forecast combining MOHID (48h) + ROMS (96h).
 * Returns merged hourly forecast data with computed extremes and coverage metadata.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const stationId = searchParams.get("station");

  const station = stationId ? getStation(stationId) : getDefaultStation();
  if (!station) {
    return NextResponse.json(
      { error: `Unknown station: ${stationId}` },
      { status: 404 }
    );
  }

  try {
    const { points, coverage, primaryModel } =
      await fetchExtendedForecast(station);
    const extremes = findExtremes(points);

    return NextResponse.json(
      {
        station: station.id,
        model: primaryModel,
        generatedAt: new Date().toISOString(),
        points,
        extremes,
        coverage,
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=21600, stale-while-revalidate=43200",
        },
      }
    );
  } catch (error) {
    console.error(`Failed to fetch forecast for ${station.id}:`, error);

    return NextResponse.json(
      {
        error: "Failed to fetch tide forecast",
        detail: error instanceof Error ? error.message : "Unknown error",
        station: station.id,
      },
      { status: 502 }
    );
  }
}
