import { NextResponse } from "next/server";
import { STATIONS } from "@/lib/stations";
import { fetchObservations } from "@/lib/thredds/puertos";
import { fetchForecast } from "@/lib/thredds/meteogalicia";
import { computeTideState, mergeTimeSeries } from "@/lib/tides/interpolation";
import type { TidePoint } from "@/lib/tides/types";

/**
 * GET /api/tides/heights
 *
 * Returns current tide height for all stations in a single request.
 * Designed for the map page to avoid 7 individual /api/tides/combined calls.
 *
 * Response shape:
 * {
 *   heights: { [stationId]: number | null },
 *   updatedAt: string
 * }
 */
export async function GET() {
  const now = new Date();
  const date = new Date();

  const results = await Promise.allSettled(
    STATIONS.map(async (station) => {
      let obsPoints: TidePoint[] = [];
      let fcstPoints: TidePoint[] = [];

      const [obsResult, fcstResult] = await Promise.allSettled([
        fetchObservations(station, date),
        fetchForecast(station),
      ]);

      if (obsResult.status === "fulfilled") {
        obsPoints = obsResult.value;
      }
      if (fcstResult.status === "fulfilled") {
        fcstPoints = fcstResult.value;
      }

      if (obsPoints.length === 0 && fcstPoints.length === 0) {
        return { id: station.id, height: null };
      }

      const merged = mergeTimeSeries(obsPoints, fcstPoints);
      const state = computeTideState(merged, now);

      return {
        id: station.id,
        height: state.currentHeight,
      };
    })
  );

  const heights: Record<string, number | null> = {};
  for (const result of results) {
    if (result.status === "fulfilled") {
      heights[result.value.id] = result.value.height;
    }
  }

  return NextResponse.json(
    {
      heights,
      updatedAt: now.toISOString(),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
      },
    }
  );
}
