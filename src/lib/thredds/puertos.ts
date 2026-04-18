/**
 * Puertos del Estado THREDDS data fetcher.
 *
 * Fetches tide gauge observations via OPeNDAP ASCII from opendap.puertos.es.
 *
 * File path pattern:
 *   /thredds/dodsC/tidegauge_{gaugeId}/{year}/{month}/MIR2Z_{prefix}_{gaugeId}_{platformId}_{YYYYMMDD}.nc4.ascii
 *
 * The raw data is sampled at 2Hz (172800 points per day).
 * We subsample by requesting every 1800th point = 15-minute intervals (96 points/day).
 */

import type { TidePoint } from "@/lib/tides/types";
import type { Station } from "@/lib/tides/types";
import { parseOPeNDAPAscii } from "./parser";
import { fetchWithRetry } from "./retry";
import { evictCache } from "./cache";

const PUERTOS_BASE = "https://opendap.puertos.es/thredds/dodsC";

/** Simple in-memory cache with TTL. */
const cache = new Map<string, { data: TidePoint[]; expiresAt: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const MAX_CACHE_ENTRIES = 100; // ~7 stations × ~14 days of history

/**
 * Build the OPeNDAP URL for a station on a given date.
 * Subsamples every 1800th point to get ~15-minute intervals.
 */
function buildObservationsUrl(station: Station, date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const dateStr = `${year}${month}${day}`;

  // THREDDS catalog uses lowercase gauge ID in the path
  const gaugeIdLower = station.tideGaugeId.toLowerCase();
  const basePath = `tidegauge_${gaugeIdLower}/${year}/${month}`;
  const fileName = `MIR2Z_${station.filePrefix}_${station.tideGaugeId}_${station.platformId}_${dateStr}.nc4`;

  // Raw data is 2Hz (172800 points/day). Subsample every 1800th = 15-min intervals (96 pts).
  // Brackets must be percent-encoded; Node 22 undici rejects bare [] in URLs.
  const subset = `TIME%5B0:1800:172799%5D,SLEV%5B0:1800:172799%5D%5B0%5D`;

  return `${PUERTOS_BASE}/${basePath}/${fileName}.ascii?${subset}`;
}

/**
 * Convert Puertos del Estado time values to ISO timestamps.
 * TIME is "days since 1950-01-01 00:00:00 UTC" (CNES Julian Day convention).
 * Fractional part represents time within the day.
 */
const EPOCH_1950 = Date.UTC(1950, 0, 1); // 1950-01-01T00:00:00Z in ms

function timeToISO(daysSince1950: number): string {
  const ms = EPOCH_1950 + daysSince1950 * 86_400_000;
  return new Date(ms).toISOString();
}

/**
 * Fetch tide gauge observations for a given station and date.
 *
 * @param station - The station to fetch data for
 * @param date - The date to fetch (UTC)
 * @returns Array of TidePoint with 15-minute resolution
 */
export async function fetchObservations(
  station: Station,
  date: Date
): Promise<TidePoint[]> {
  const cacheKey = `obs:${station.id}:${date.toISOString().split("T")[0]}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  const url = buildObservationsUrl(station, date);

  const response = await fetchWithRetry(
    url,
    { headers: { Accept: "text/plain" } },
    { maxAttempts: 2, timeoutMs: 4_000, baseDelayMs: 300 }
  );

  const text = await response.text();
  const parsed = parseOPeNDAPAscii(text);

  const timeVar = parsed.variables["TIME"];
  const slevVar = parsed.variables["SLEV"];

  if (!timeVar || !slevVar) {
    throw new Error(
      `Missing TIME or SLEV variables in response. Found: ${Object.keys(parsed.variables).join(", ")}`
    );
  }

  const points: TidePoint[] = [];
  const count = Math.min(timeVar.values.length, slevVar.values.length);

  for (let i = 0; i < count; i++) {
    const height = slevVar.values[i];
    // Skip NaN/fill values (typically -999 or 9999)
    if (isNaN(height) || Math.abs(height) > 50) continue;

    points.push({
      time: timeToISO(timeVar.values[i]),
      height: Math.round(height * 1000) / 1000, // 1mm precision
    });
  }

  // Evict expired entries, then oldest if still over limit
  evictCache(cache, MAX_CACHE_ENTRIES);
  cache.set(cacheKey, { data: points, expiresAt: Date.now() + CACHE_TTL_MS });
  return points;
}

/** Clear the observations cache (useful for testing). */
export function clearObservationsCache(): void {
  cache.clear();
}
