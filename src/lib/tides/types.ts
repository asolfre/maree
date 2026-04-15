/** Core types for tidal data throughout the Maree app. */

/** A single tide measurement or prediction point. */
export interface TidePoint {
  /** ISO 8601 timestamp */
  time: string;
  /** Sea level height in meters (relative to station datum) */
  height: number;
}

/** A high or low tide extreme. */
export interface TideExtreme {
  time: string;
  height: number;
  type: "high" | "low";
}

/** Current tide state derived from observations/forecast. */
export interface TideState {
  /** Current interpolated height in meters */
  currentHeight: number;
  /** Whether the tide is rising or falling */
  direction: "rising" | "falling";
  /** Next high tide */
  nextHigh: TideExtreme | null;
  /** Next low tide */
  nextLow: TideExtreme | null;
  /** Percentage through current tide cycle (0=low, 100=high or vice versa) */
  cycleProgress: number;
}

/** A tide gauge station on the Galician coast. */
export interface Station {
  id: string;
  name: string;
  /** Short display name */
  shortName: string;
  lat: number;
  lon: number;
  /** Puertos del Estado tide gauge identifier */
  tideGaugeId: string;
  /** Puertos del Estado platform numeric ID (for file paths) */
  platformId: string;
  /** File name prefix (e.g. "Vigo") used in THREDDS paths */
  filePrefix: string;
  /** MeteoGalicia MOHID model name, or null for ROMS fallback */
  mohidModel: string | null;
  /** Approximate grid indices for MOHID model [lat_idx, lon_idx] */
  mohidGridPoint: [number, number] | null;
}

/** Response from /api/tides/observations */
export interface ObservationsResponse {
  station: string;
  date: string;
  points: TidePoint[];
  extremes: TideExtreme[];
  state: TideState;
}

/** Response from /api/tides/forecast */
export interface ForecastResponse {
  station: string;
  model: string;
  generatedAt: string;
  points: TidePoint[];
  extremes: TideExtreme[];
  /** Coverage metadata per model */
  coverage?: ForecastCoverage[];
}

/** Metadata describing forecast model coverage. */
export interface ForecastCoverage {
  model: string;
  /** ISO 8601 start of coverage */
  from: string;
  /** ISO 8601 end of coverage */
  to: string;
  /** Number of data points from this model */
  pointCount: number;
}

/** Response from /api/tides/combined */
export interface CombinedTideResponse {
  station: string;
  date: string;
  isLive: boolean;
  /** Observation-only points (for "observed" chart styling) */
  obsPoints: TidePoint[];
  /** Forecast-only points (for "forecast/dashed" chart styling) */
  fcstPoints: TidePoint[];
  /** Merged time series (observations + forecast continuation) */
  points: TidePoint[];
  extremes: TideExtreme[];
  /** State computed from merged data — nextHigh/nextLow always populated */
  state: TideState;
}

/** Celestial data for a location and date */
export interface CelestialData {
  sunrise: string;
  sunset: string;
  dayLengthMinutes: number;
}
