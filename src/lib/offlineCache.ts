/**
 * Lightweight localStorage cache for offline display.
 *
 * The home page stores the most recent successful tide + weather snapshot so
 * that the offline fallback page can show something useful when there is no
 * network connection.
 */

const CACHE_KEY = "maree:offline-snapshot";

export interface OfflineSnapshot {
  /** Station human-readable name */
  stationName: string;
  /** Station id */
  stationId: string;
  /** Current height in meters (from TideState) */
  currentHeight: number | null;
  /** "rising" | "falling" */
  direction: string | null;
  /** ISO 8601 timestamp of when this snapshot was saved */
  savedAt: string;
  /** Wind speed in km/h */
  windSpeed: number | null;
  /** Sea surface temperature in °C */
  seaTemp: number | null;
  /** Number of species currently under biological closure */
  activeClosureCount?: number | null;
}

/** Save a snapshot to localStorage. Silently no-ops if storage is unavailable. */
export function saveOfflineSnapshot(snapshot: OfflineSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    // Storage full or unavailable — non-fatal
  }
}

/** Load the last saved snapshot, or null if none exists. */
export function loadOfflineSnapshot(): OfflineSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OfflineSnapshot;
  } catch {
    return null;
  }
}
