import { NextResponse } from "next/server";
import { STATIONS } from "@/lib/stations";

/**
 * GET /api/stations
 * Returns the list of all Galician tide gauge stations.
 */
export async function GET() {
  const stations = STATIONS.map((s) => ({
    id: s.id,
    name: s.name,
    shortName: s.shortName,
    lat: s.lat,
    lon: s.lon,
    hasMOHID: s.mohidModel !== null,
  }));

  return NextResponse.json({ stations }, {
    headers: {
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
