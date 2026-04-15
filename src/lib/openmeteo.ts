/**
 * Open-Meteo weather and marine data fetcher.
 *
 * Uses two Open-Meteo APIs:
 * - Weather API: wind speed/direction/gusts, visibility
 * - Marine API: wave height/period/direction, SST
 *
 * No API key required. Free tier: 10,000 calls/day.
 *
 * IMPORTANT: The marine API requires coordinates over water.
 * Each station has an associated offshore point for marine queries.
 */

export interface WeatherData {
  /** Wind speed in knots */
  windSpeed: number;
  /** Wind direction in degrees (0=N, 90=E, 180=S, 270=W) */
  windDirection: number;
  /** Wind gusts in knots */
  windGusts: number;
  /** Visibility in meters */
  visibility: number;
}

export interface MarineData {
  /** Significant wave height in meters */
  waveHeight: number;
  /** Wave period in seconds */
  wavePeriod: number;
  /** Wave direction in degrees */
  waveDirection: number;
  /** Sea surface temperature in Celsius */
  seaTemp: number | null;
}

export interface CoastalConditions {
  weather: WeatherData;
  marine: MarineData;
  /** ISO timestamp of the data */
  timestamp: string;
}

/**
 * Offshore coordinates for marine API queries.
 * The marine API needs points over the ocean, not land.
 * These are ~10-20km offshore from each station.
 */
const OFFSHORE_POINTS: Record<string, { lat: number; lon: number }> = {
  vigo: { lat: 42.2, lon: -9.0 },
  villagarcia: { lat: 42.5, lon: -9.0 },
  marin: { lat: 42.3, lon: -9.0 },
  coruna: { lat: 43.4, lon: -8.6 },
  ferrol: { lat: 43.5, lon: -8.5 },
  sancibrao: { lat: 43.75, lon: -7.7 },
  langosteira: { lat: 43.3, lon: -8.8 },
};

/** Default offshore point (off Vigo) */
const DEFAULT_OFFSHORE = { lat: 42.5, lon: -9.2 };

/**
 * Convert wind direction in degrees to a Spanish compass label.
 */
export function windDirectionLabel(deg: number): string {
  const labels = [
    "Norte",
    "Noreste",
    "Este",
    "Sureste",
    "Sur",
    "Suroeste",
    "Oeste",
    "Noroeste",
  ];
  // Normalize to [0, 360) to handle negative degrees correctly.
  // JS modulo can return negative values, so we add 360 before the final mod.
  const normalized = ((deg % 360) + 360) % 360;
  const idx = Math.round(normalized / 45) % 8;
  return labels[idx];
}

/**
 * Classify visibility into a human-readable Spanish label.
 */
export function visibilityLabel(meters: number): string {
  if (meters >= 10000) return "Excelente";
  if (meters >= 5000) return "Buena";
  if (meters >= 2000) return "Moderada";
  if (meters >= 1000) return "Reducida";
  return "Muy reducida";
}

/**
 * Fetch current weather data from Open-Meteo Weather API.
 */
async function fetchWeather(
  lat: number,
  lon: number
): Promise<WeatherData> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility` +
    `&wind_speed_unit=kn` +
    `&timezone=Europe/Madrid`;

  const res = await fetch(url, { next: { revalidate: 900 } }); // cache 15min
  if (!res.ok) {
    throw new Error(`Open-Meteo weather API error: ${res.status}`);
  }

  const data = await res.json();
  const c = data.current;

  return {
    windSpeed: c.wind_speed_10m ?? 0,
    windDirection: c.wind_direction_10m ?? 0,
    windGusts: c.wind_gusts_10m ?? 0,
    visibility: c.visibility ?? 10000,
  };
}

/**
 * Fetch current marine data from Open-Meteo Marine API.
 */
async function fetchMarine(
  lat: number,
  lon: number
): Promise<MarineData> {
  const url =
    `https://marine-api.open-meteo.com/v1/marine` +
    `?latitude=${lat}&longitude=${lon}` +
    `&current=wave_height,wave_period,wave_direction,sea_surface_temperature` +
    `&cell_selection=sea`;

  const res = await fetch(url, { next: { revalidate: 900 } });
  if (!res.ok) {
    throw new Error(`Open-Meteo marine API error: ${res.status}`);
  }

  const data = await res.json();
  const c = data.current;

  return {
    waveHeight: c.wave_height ?? 0,
    wavePeriod: c.wave_period ?? 0,
    waveDirection: c.wave_direction ?? 0,
    seaTemp: c.sea_surface_temperature ?? null,
  };
}

/**
 * Fetch combined coastal conditions for a station.
 * Fetches weather (at station coords) and marine (at offshore coords) in parallel.
 */
export async function fetchCoastalConditions(
  stationId: string,
  stationLat: number,
  stationLon: number
): Promise<CoastalConditions> {
  const offshore = OFFSHORE_POINTS[stationId] ?? DEFAULT_OFFSHORE;

  const [weather, marine] = await Promise.all([
    fetchWeather(stationLat, stationLon),
    fetchMarine(offshore.lat, offshore.lon),
  ]);

  return {
    weather,
    marine,
    timestamp: new Date().toISOString(),
  };
}
