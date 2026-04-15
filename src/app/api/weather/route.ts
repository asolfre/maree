import { NextRequest, NextResponse } from "next/server";
import { getStation, getDefaultStation } from "@/lib/stations";
import { fetchCoastalConditions } from "@/lib/openmeteo";

/**
 * GET /api/weather?station=vigo
 *
 * Fetches current weather and marine conditions from Open-Meteo.
 * Returns wind, visibility, wave height, SST for the given station.
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
    const conditions = await fetchCoastalConditions(
      station.id,
      station.lat,
      station.lon
    );

    return NextResponse.json(
      {
        station: station.id,
        ...conditions,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
        },
      }
    );
  } catch (error) {
    console.error(`Failed to fetch weather for ${station.id}:`, error);

    return NextResponse.json(
      {
        error: "Failed to fetch weather data",
        detail: error instanceof Error ? error.message : "Unknown error",
        station: station.id,
      },
      { status: 502 }
    );
  }
}
