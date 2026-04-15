/**
 * MeteoGalicia THREDDS data fetcher.
 *
 * Fetches tide forecasts from thredds.meteogalicia.gal via OPeNDAP ASCII:
 *
 * - MOHID per-ria models (48h): mohid_artabro, mohid_portocoruna, mohid_portolangosteira, etc.
 * - MOHID Riasbaixas (96h): unified model covering Vigo/Arousa/NoiaMuros at ~333m resolution.
 * - ROMS Novo 2km (96h, coast-wide fallback): rectilinear grid, lat[401] x lon[476].
 *
 * All models use the FMRC (Forecast Model Run Collection) file structure.
 *
 * MOHID path pattern:
 *   {dirName}/fmrc/files/{YYYYMMDD}/MOHID_{Name}_{YYYYMMDD}_0000.nc4
 *   Variables: time (seconds since forecast start), water_level[time][lat][lon]
 *
 * ROMS Novo path pattern:
 *   romsNovo/fmrc/files/{YYYYMMDD}/roms_002_{YYYYMMDD}_0000.nc4
 *   Variables: time[97] (seconds since 2011-01-01), zeta[time][lat][lon]
 *   Grid: lat[401] x lon[476] (rectilinear, ~2km, 38-46N / 14-4.5W)
 */

import type { TidePoint } from "@/lib/tides/types";
import type { Station, ForecastCoverage } from "@/lib/tides/types";
import { fetchWithRetry } from "./retry";
import { evictCache } from "./cache";

const METEOGALICIA_BASE = "https://thredds.meteogalicia.gal/thredds/dodsC";

/**
 * MOHID model file-name configuration.
 * Regular models: MOHID_{displayName}_{date}_0000.nc4
 * Porto models:   MOHIDP_{displayName}P_{date}_0000.nc4
 *
 * dirName overrides the THREDDS directory name when it differs from the
 * model key (e.g. mohid_riasbaixas -> mohid_Riasbaixas on the server).
 *
 * maxTimeIdx is the last time index to request (48 = 49 steps / 2 days,
 * 96 = 97 steps / 4 days).
 */
interface MohidFileConfig {
  displayName: string;
  isPorto: boolean;
  dirName?: string;
  maxTimeIdx: number;
}
const MOHID_FILE_CONFIG: Record<string, MohidFileConfig> = {
  mohid_vigo: { displayName: "Vigo", isPorto: false, maxTimeIdx: 48 },
  mohid_arousa: { displayName: "Arousa", isPorto: false, maxTimeIdx: 48 },
  mohid_artabro: { displayName: "Artabro", isPorto: false, maxTimeIdx: 48 },
  mohid_noiamuros: { displayName: "NoiaMuros", isPorto: false, maxTimeIdx: 48 },
  mohid_portocoruna: { displayName: "Coruna", isPorto: true, maxTimeIdx: 48 },
  mohid_portolangosteira: { displayName: "Langosteira", isPorto: true, maxTimeIdx: 48 },
  mohid_riasbaixas: {
    displayName: "Riasbaixas",
    isPorto: false,
    dirName: "mohid_Riasbaixas",
    maxTimeIdx: 96,
  },
};

/** ROMS epoch: 2011-01-01T00:00:00Z (shared by both old ROMS and ROMS Novo) */
const ROMS_EPOCH_MS = Date.UTC(2011, 0, 1);

/** Simple in-memory cache with TTL. */
const cache = new Map<string, { data: TidePoint[]; expiresAt: number }>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const MAX_CACHE_ENTRIES = 50; // ~7 stations × ~3 cache types (forecast, extended, roms)

/**
 * Build the OPeNDAP URL for a MOHID forecast at a specific grid point.
 * Uses today's forecast run file directly.
 */
function buildMOHIDUrl(
  modelName: string,
  latIdx: number,
  lonIdx: number,
  dateStr: string
): string {
  const config = MOHID_FILE_CONFIG[modelName];
  if (!config) {
    throw new Error(`Unknown MOHID model: ${modelName}`);
  }

  // Porto models: MOHIDP_{Name}P_{date}_0000.nc4
  // Regular:      MOHID_{Name}_{date}_0000.nc4
  const fileName = config.isPorto
    ? `MOHIDP_${config.displayName}P_${dateStr}_0000.nc4`
    : `MOHID_${config.displayName}_${dateStr}_0000.nc4`;
  const dir = config.dirName ?? modelName;
  const filePath = `${dir}/fmrc/files/${dateStr}/${fileName}`;

  // Request time steps at the specific lat/lon grid point.
  // maxTimeIdx varies by model (48 for per-ria, 96 for Riasbaixas).
  // Percent-encode brackets for strict HTTP clients (Node 22 undici).
  const t = config.maxTimeIdx;
  const subset = `time%5B0:1:${t}%5D,water_level%5B0:1:${t}%5D%5B${latIdx}%5D%5B${lonIdx}%5D`;
  return `${METEOGALICIA_BASE}/${filePath}.ascii?${subset}`;
}

/**
 * Build the OPeNDAP URL for ROMS Novo 2km forecast at the nearest grid point.
 * ROMS Novo uses 1D rectilinear lat/lon and the variable name "time" (not "ocean_time").
 */
function buildROMSUrl(
  latIdx: number,
  lonIdx: number,
  dateStr: string
): string {
  const filePath = `romsNovo/fmrc/files/${dateStr}/roms_002_${dateStr}_0000.nc4`;

  // ROMS Novo provides 97 hourly steps (4 days).
  // Percent-encode brackets for strict HTTP clients (Node 22 undici).
  const subset = `time%5B0:1:96%5D,zeta%5B0:1:96%5D%5B${latIdx}%5D%5B${lonIdx}%5D`;
  return `${METEOGALICIA_BASE}/${filePath}.ascii?${subset}`;
}

/**
 * Find the nearest ROMS Novo grid point for a given lat/lon.
 * ROMS Novo uses a rectilinear grid with uniform spacing:
 *   lat[401]: 38.0 to 46.0, step 0.02 (~2.2km)
 *   lon[476]: -14.0 to -4.5, step 0.02 (~2.2km)
 */
function findROMSGridPoint(lat: number, lon: number): [number, number] {
  const latIdx = Math.round((lat - 38.0) / 0.02);
  const lonIdx = Math.round((lon - -14.0) / 0.02);

  return [
    Math.max(0, Math.min(400, latIdx)),
    Math.max(0, Math.min(475, lonIdx)),
  ];
}

/**
 * Get today's date string for forecast file lookup, in YYYYMMDD format.
 * If the current hour is very early (< 6 UTC), the latest run may still
 * be from yesterday, so we try today first then fall back.
 */
function getTodayDateStr(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function getYesterdayDateStr(): string {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() - 1);
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

/**
 * Parse the OPeNDAP ASCII response for MOHID or ROMS forecast data.
 *
 * MOHID returns:
 *   time[49]: 0.0, 3600.0, ...  (seconds since forecast start)
 *   water_level.water_level[49][1][1]: [0][0], 0.275  (Grid format)
 *
 * ROMS Novo returns:
 *   time[97]: 4.81E8, ...  (seconds since 2011-01-01)
 *   zeta.zeta[97][1][1]: [0][0], 0.68  (Grid format)
 *
 * Both models now use "time" as the time variable name.
 */
function parseForecastAscii(
  text: string,
  type: "mohid" | "roms"
): { times: number[]; values: number[] } {
  const separatorIdx = text.indexOf("\n-----");
  if (separatorIdx === -1) {
    throw new Error(
      "Invalid OPeNDAP ASCII response: no data separator found"
    );
  }

  const dataSection = text.substring(separatorIdx + 1);
  const lines = dataSection.split("\n").filter((l) => l.trim().length > 0);

  const times: number[] = [];
  const values: number[] = [];

  // Both MOHID and ROMS Novo use "time" as the time variable name.
  // The level variable differs: "water_level" for MOHID, "zeta" for ROMS.
  const levelVarPrefix = type === "roms" ? "zeta" : "water_level";

  let currentSection: "none" | "time" | "level" = "none";

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("---")) continue;

    // Detect section headers like "time[49]", "time[97]",
    // "water_level.water_level[49][1][1]", "zeta.zeta[97][1][1]"
    if (trimmed.match(/^time\[\d+\]\s*$/)) {
      currentSection = "time";
      continue;
    }

    if (trimmed.includes(levelVarPrefix) && trimmed.match(/\[\d+\]/)) {
      // Could be "water_level.water_level[49][1][1]" or "zeta.zeta[97][1][1]"
      // or "water_level[49][1][1]"
      if (!trimmed.match(/^time\[/)) {
        currentSection = "level";
        continue;
      }
    }

    // Also detect lat/lon sections to skip them
    if (
      trimmed.match(/^(lat|lon|lat_rho|lon_rho)(\.\w+)?\[\d+\]/) ||
      trimmed.match(/^(depth|mask)/)
    ) {
      currentSection = "none";
      continue;
    }

    // Parse data in current section
    if (currentSection === "time") {
      // Comma-separated: "0.0, 3600.0, ..." or "4.81E8, 4.81E8, ..."
      const vals = trimmed
        .split(",")
        .map((v) => parseFloat(v.trim()))
        .filter((v) => !isNaN(v));
      times.push(...vals);
    } else if (currentSection === "level") {
      // Indexed format: "[0][0], 0.275" or "[0], 0.68"
      const indexedMatch = trimmed.match(/^\[[\d\]\[]+,\s*(.+)$/);
      if (indexedMatch) {
        const val = parseFloat(indexedMatch[1].trim());
        if (!isNaN(val)) values.push(val);
      } else {
        // Could also be comma-separated plain values
        const vals = trimmed
          .split(",")
          .map((v) => parseFloat(v.trim()))
          .filter((v) => !isNaN(v));
        if (vals.length > 0) values.push(...vals);
      }
    }
  }

  return { times, values };
}

/**
 * Fetch forecast data for a station.
 * Uses MOHID model if available, falls back to ROMS 2km.
 */
export async function fetchForecast(station: Station): Promise<TidePoint[]> {
  const cacheKey = `forecast:${station.id}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  if (station.mohidModel && station.mohidGridPoint) {
    try {
      const points = await fetchMOHID(station);
      if (points.length > 0) {
        evictCache(cache, MAX_CACHE_ENTRIES);
        cache.set(cacheKey, {
          data: points,
          expiresAt: Date.now() + CACHE_TTL_MS,
        });
        return points;
      }
    } catch (err) {
      console.warn(
        `MOHID ${station.mohidModel} failed for ${station.id}, falling back to ROMS:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  // ROMS fallback
  const points = await fetchROMS(station);
  evictCache(cache, MAX_CACHE_ENTRIES);
  cache.set(cacheKey, {
    data: points,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
  return points;
}

/**
 * Fetch MOHID forecast for a station.
 */
async function fetchMOHID(station: Station): Promise<TidePoint[]> {
  const dateStr = getTodayDateStr();
  const url = buildMOHIDUrl(
    station.mohidModel!,
    station.mohidGridPoint![0],
    station.mohidGridPoint![1],
    dateStr
  );

  let response: Response;
  let usedDateStr = dateStr;
  try {
    response = await fetchWithRetry(
      url,
      { headers: { Accept: "text/plain" }, redirect: "follow" },
      { maxAttempts: 2, timeoutMs: 30_000, baseDelayMs: 500 }
    );
  } catch {
    // Today's run not available yet — try yesterday's with retry
    const yesterdayStr = getYesterdayDateStr();
    usedDateStr = yesterdayStr;
    const fallbackUrl = buildMOHIDUrl(
      station.mohidModel!,
      station.mohidGridPoint![0],
      station.mohidGridPoint![1],
      yesterdayStr
    );
    response = await fetchWithRetry(
      fallbackUrl,
      { headers: { Accept: "text/plain" }, redirect: "follow" },
      { maxAttempts: 2, timeoutMs: 30_000, baseDelayMs: 500 }
    );
  }

  if (!response.ok) {
    throw new Error(
      `MOHID returned ${response.status} for ${station.id}`
    );
  }

  const text = await response.text();
  const parsed = parseForecastAscii(text, "mohid");

  // MOHID time is seconds since forecast start (midnight UTC of the run day)
  const runDateStr = usedDateStr;
  const runYear = parseInt(runDateStr.substring(0, 4));
  const runMonth = parseInt(runDateStr.substring(4, 6)) - 1;
  const runDay = parseInt(runDateStr.substring(6, 8));
  const refDate = new Date(Date.UTC(runYear, runMonth, runDay));

  const points: TidePoint[] = [];
  const count = Math.min(parsed.times.length, parsed.values.length);

  for (let i = 0; i < count; i++) {
    const height = parsed.values[i];
    if (isNaN(height) || Math.abs(height) > 50) continue;

    const ms = refDate.getTime() + parsed.times[i] * 1000;
    points.push({
      time: new Date(ms).toISOString(),
      height: Math.round(height * 1000) / 1000,
    });
  }

  return points;
}

/**
 * Fetch ROMS Novo 2km forecast for a station.
 */
async function fetchROMS(station: Station): Promise<TidePoint[]> {
  const [latIdx, lonIdx] = findROMSGridPoint(station.lat, station.lon);
  const dateStr = getTodayDateStr();
  const url = buildROMSUrl(latIdx, lonIdx, dateStr);

  let response: Response;
  try {
    response = await fetchWithRetry(
      url,
      { headers: { Accept: "text/plain" }, redirect: "follow" },
      { maxAttempts: 2, timeoutMs: 30_000, baseDelayMs: 500 }
    );
  } catch {
    // Today's run not available yet — try yesterday's with retry
    const yesterdayStr = getYesterdayDateStr();
    const fallbackUrl = buildROMSUrl(latIdx, lonIdx, yesterdayStr);
    response = await fetchWithRetry(
      fallbackUrl,
      { headers: { Accept: "text/plain" }, redirect: "follow" },
      { maxAttempts: 2, timeoutMs: 30_000, baseDelayMs: 500 }
    );
  }

  if (!response.ok) {
    throw new Error(
      `ROMS returned ${response.status} for ${station.id}`
    );
  }

  const text = await response.text();
  const parsed = parseForecastAscii(text, "roms");

  // ROMS time is seconds since 2011-01-01T00:00:00Z
  const points: TidePoint[] = [];
  const count = Math.min(parsed.times.length, parsed.values.length);

  for (let i = 0; i < count; i++) {
    const height = parsed.values[i];
    // Filter NaN, extreme values, and ROMS Novo fill value (-999)
    if (isNaN(height) || Math.abs(height) > 50) continue;

    const ms = ROMS_EPOCH_MS + parsed.times[i] * 1000;
    points.push({
      time: new Date(ms).toISOString(),
      height: Math.round(height * 1000) / 1000,
    });
  }

  return points;
}

/** Extended forecast result with coverage metadata. */
export interface ExtendedForecastResult {
  points: TidePoint[];
  coverage: ForecastCoverage[];
  primaryModel: string;
}

/**
 * Check whether a MOHID model already provides full 96h coverage,
 * making a supplementary ROMS fetch unnecessary.
 */
function isFullCoverageMohid(modelName: string): boolean {
  const config = MOHID_FILE_CONFIG[modelName];
  return config ? config.maxTimeIdx >= 96 : false;
}

/**
 * Fetch extended forecast combining available models.
 *
 * - Riasbaixas stations (96h MOHID): MOHID alone is sufficient.
 * - Per-ria MOHID stations (48h): MOHID + ROMS in parallel; MOHID for
 *   first 48h, ROMS fills days 3-4.
 * - ROMS-only stations: ROMS alone (96h).
 */
export async function fetchExtendedForecast(
  station: Station
): Promise<ExtendedForecastResult> {
  const cacheKey = `extended:${station.id}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    // Cached result stores points; rebuild coverage from metadata stored alongside
    const meta = extendedMetaCache.get(cacheKey);
    return {
      points: cached.data,
      coverage: meta?.coverage ?? [],
      primaryModel: meta?.primaryModel ?? "roms_2km",
    };
  }

  const coverage: ForecastCoverage[] = [];
  let mohidPoints: TidePoint[] = [];
  let romsPoints: TidePoint[] = [];

  if (station.mohidModel && station.mohidGridPoint) {
    const fullCoverage = isFullCoverageMohid(station.mohidModel);

    if (fullCoverage) {
      // Riasbaixas (96h) — MOHID alone covers the full forecast window
      try {
        mohidPoints = await fetchMOHID(station);
        if (mohidPoints.length > 0) {
          coverage.push(buildCoverage(station.mohidModel, mohidPoints));
        }
      } catch (err) {
        console.warn(
          `Extended forecast: MOHID ${station.mohidModel} failed for ${station.id}, falling back to ROMS:`,
          err instanceof Error ? err.message : err
        );
        // Fall back to ROMS
        try {
          romsPoints = await fetchROMS(station);
          if (romsPoints.length > 0) {
            coverage.push(buildCoverage("roms_2km", romsPoints));
          }
        } catch (romsErr) {
          console.warn(
            `Extended forecast: ROMS fallback also failed for ${station.id}:`,
            romsErr instanceof Error ? romsErr.message : romsErr
          );
        }
      }
    } else {
      // Per-ria MOHID (48h) — fetch both MOHID and ROMS in parallel
      const [mohidResult, romsResult] = await Promise.allSettled([
        fetchMOHID(station),
        fetchROMS(station),
      ]);

      if (mohidResult.status === "fulfilled" && mohidResult.value.length > 0) {
        mohidPoints = mohidResult.value;
        coverage.push(buildCoverage(station.mohidModel, mohidPoints));
      } else if (mohidResult.status === "rejected") {
        console.warn(
          `Extended forecast: MOHID failed for ${station.id}:`,
          mohidResult.reason instanceof Error
            ? mohidResult.reason.message
            : mohidResult.reason
        );
      }

      if (romsResult.status === "fulfilled" && romsResult.value.length > 0) {
        romsPoints = romsResult.value;
        coverage.push(buildCoverage("roms_2km", romsPoints));
      } else if (romsResult.status === "rejected") {
        console.warn(
          `Extended forecast: ROMS failed for ${station.id}:`,
          romsResult.reason instanceof Error
            ? romsResult.reason.message
            : romsResult.reason
        );
      }
    }
  } else {
    // ROMS-only station
    try {
      romsPoints = await fetchROMS(station);
      if (romsPoints.length > 0) {
        coverage.push(buildCoverage("roms_2km", romsPoints));
      }
    } catch (err) {
      console.warn(
        `Extended forecast: ROMS failed for ${station.id}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  // Merge: MOHID takes priority, ROMS fills remaining time
  let merged: TidePoint[];
  if (mohidPoints.length > 0 && romsPoints.length > 0) {
    const lastMohidTime = new Date(
      mohidPoints[mohidPoints.length - 1].time
    ).getTime();
    merged = [
      ...mohidPoints,
      ...romsPoints.filter(
        (p) => new Date(p.time).getTime() > lastMohidTime
      ),
    ];
  } else if (mohidPoints.length > 0) {
    merged = mohidPoints;
  } else {
    merged = romsPoints;
  }

  const primaryModel =
    mohidPoints.length > 0 ? (station.mohidModel ?? "roms_2km") : "roms_2km";

  // Cache
  evictCache(cache, MAX_CACHE_ENTRIES);
  cache.set(cacheKey, {
    data: merged,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
  // extendedMetaCache follows the same eviction cycle as the main cache
  evictExtendedMeta(extendedMetaCache, MAX_CACHE_ENTRIES);
  extendedMetaCache.set(cacheKey, { coverage, primaryModel });

  return { points: merged, coverage, primaryModel };
}

/** Metadata cache for extended forecast results (parallel to point cache). */
const extendedMetaCache = new Map<
  string,
  { coverage: ForecastCoverage[]; primaryModel: string }
>();

/** Evict oldest entries from the metadata cache when it exceeds the limit. */
function evictExtendedMeta(
  meta: Map<string, unknown>,
  maxEntries: number,
): void {
  while (meta.size > maxEntries) {
    const oldest = meta.keys().next();
    if (oldest.done) break;
    meta.delete(oldest.value);
  }
}

/** Build coverage metadata from a set of forecast points. */
function buildCoverage(model: string, points: TidePoint[]): ForecastCoverage {
  return {
    model,
    from: points[0].time,
    to: points[points.length - 1].time,
    pointCount: points.length,
  };
}

/** Clear the forecast cache (useful for testing). */
export function clearForecastCache(): void {
  cache.clear();
  extendedMetaCache.clear();
}
