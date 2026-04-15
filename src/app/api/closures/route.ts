import { NextRequest, NextResponse } from "next/server";
import { getAllSpeciesClosureInfo } from "@/lib/species/closures";
import { fetchDogFeedEntries } from "@/lib/species/dog-feed";
import type { ClosuresResponse } from "@/lib/species/types";

/**
 * GET /api/closures?category=shellfish&status=closed
 *
 * Returns biological closure status for all tracked Galician species,
 * optionally filtered by category and/or status. Also includes recent
 * DOG (Diario Oficial de Galicia) feed entries related to fishing.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const categoryFilter = searchParams.get("category");
  const statusFilter = searchParams.get("status");

  try {
    // Fetch closures and DOG feed in parallel
    const [allClosures, dogFeedEntries] = await Promise.all([
      Promise.resolve(getAllSpeciesClosureInfo()),
      fetchDogFeedEntries(),
    ]);

    // Apply filters
    let closures = allClosures;

    if (categoryFilter) {
      closures = closures.filter(
        (c) => c.species.category === categoryFilter,
      );
    }

    if (statusFilter) {
      closures = closures.filter((c) => c.status === statusFilter);
    }

    const response: ClosuresResponse = {
      closures,
      lastUpdated: new Date().toISOString(),
      dogFeedEntries,
    };

    return NextResponse.json(response, {
      headers: {
        // Cache for 1 hour, allow stale for 2 hours
        "Cache-Control":
          "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    });
  } catch (error) {
    console.error("Failed to compute closures:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch closure data",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
