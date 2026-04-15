import { NextRequest, NextResponse } from "next/server";
import { findNearestStation, stationsByDistance } from "@/lib/geo";

/**
 * GET /api/stations/nearest?lat=...&lon=...
 * Returns the nearest station to the given coordinates.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const latStr = searchParams.get("lat");
  const lonStr = searchParams.get("lon");

  if (!latStr || !lonStr) {
    return NextResponse.json(
      { error: "Missing required query parameters: lat, lon" },
      { status: 400 }
    );
  }

  const lat = parseFloat(latStr);
  const lon = parseFloat(lonStr);

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json(
      { error: "Invalid coordinates: lat and lon must be numbers" },
      { status: 400 }
    );
  }

  const nearest = findNearestStation(lat, lon);
  const ranked = stationsByDistance(lat, lon).slice(0, 3);

  return NextResponse.json(
    {
      nearest: {
        id: nearest.id,
        name: nearest.name,
        shortName: nearest.shortName,
        lat: nearest.lat,
        lon: nearest.lon,
      },
      nearby: ranked.map((r) => ({
        id: r.station.id,
        name: r.station.name,
        shortName: r.station.shortName,
        lat: r.station.lat,
        lon: r.station.lon,
        distanceKm: Math.round(r.distanceKm * 10) / 10,
      })),
    },
    {
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    }
  );
}
