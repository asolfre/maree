/** Haversine distance and nearest-station utilities. */

import type { Station } from "@/lib/tides/types";
import { STATIONS } from "@/lib/stations";
import { toRad } from "@/lib/math";

const EARTH_RADIUS_KM = 6371;

/** Calculate the Haversine distance in km between two points. */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Find the nearest station to the given coordinates. */
export function findNearestStation(lat: number, lon: number): Station {
  let nearest = STATIONS[0];
  let minDist = Infinity;

  for (const station of STATIONS) {
    const dist = haversineDistance(lat, lon, station.lat, station.lon);
    if (dist < minDist) {
      minDist = dist;
      nearest = station;
    }
  }

  return nearest;
}

/** Get all stations sorted by distance from a point. */
export function stationsByDistance(
  lat: number,
  lon: number
): Array<{ station: Station; distanceKm: number }> {
  return STATIONS.map((station) => ({
    station,
    distanceKm: haversineDistance(lat, lon, station.lat, station.lon),
  })).sort((a, b) => a.distanceKm - b.distanceKm);
}
