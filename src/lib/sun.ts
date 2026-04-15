/**
 * Sunrise/sunset calculator using the NOAA Solar Calculator algorithm.
 * Adapted for use without external dependencies.
 */

import type { CelestialData } from "@/lib/tides/types";
import { toRad, toDeg } from "@/lib/math";

function toJulianDay(date: Date): number {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  const a = Math.floor((14 - m) / 12);
  const y1 = y + 4800 - a;
  const m1 = m + 12 * a - 3;
  return (
    d +
    Math.floor((153 * m1 + 2) / 5) +
    365 * y1 +
    Math.floor(y1 / 4) -
    Math.floor(y1 / 100) +
    Math.floor(y1 / 400) -
    32045
  );
}

/**
 * Calculate sunrise and sunset times for a given date and location.
 * Returns times as HH:MM strings in the local timezone offset provided.
 */
export function calculateSunTimes(
  date: Date,
  lat: number,
  lon: number,
  timezoneOffsetHours: number = 1 // CET (Spain/Galicia winter) or 2 for CEST
): CelestialData {
  const jd = toJulianDay(date);
  const jc = (jd - 2451545) / 36525; // Julian century

  // Solar geometry
  const geomMeanLongSun = (280.46646 + jc * (36000.76983 + 0.0003032 * jc)) % 360;
  const geomMeanAnomSun = 357.52911 + jc * (35999.05029 - 0.0001537 * jc);
  const eccentEarthOrbit = 0.016708634 - jc * (0.000042037 + 0.0000001267 * jc);

  const sunEqOfCenter =
    Math.sin(toRad(geomMeanAnomSun)) * (1.914602 - jc * (0.004817 + 0.000014 * jc)) +
    Math.sin(toRad(2 * geomMeanAnomSun)) * (0.019993 - 0.000101 * jc) +
    Math.sin(toRad(3 * geomMeanAnomSun)) * 0.000289;

  const sunTrueLong = geomMeanLongSun + sunEqOfCenter;
  const sunAppLong =
    sunTrueLong - 0.00569 - 0.00478 * Math.sin(toRad(125.04 - 1934.136 * jc));

  const meanObliqEcliptic =
    23 + (26 + (21.448 - jc * (46.815 + jc * (0.00059 - jc * 0.001813))) / 60) / 60;
  const obliqCorr =
    meanObliqEcliptic + 0.00256 * Math.cos(toRad(125.04 - 1934.136 * jc));

  const sunDeclin = toDeg(Math.asin(Math.sin(toRad(obliqCorr)) * Math.sin(toRad(sunAppLong))));

  const y = Math.tan(toRad(obliqCorr / 2)) ** 2;
  const eqOfTime =
    4 *
    toDeg(
      y * Math.sin(2 * toRad(geomMeanLongSun)) -
        2 * eccentEarthOrbit * Math.sin(toRad(geomMeanAnomSun)) +
        4 * eccentEarthOrbit * y * Math.sin(toRad(geomMeanAnomSun)) * Math.cos(2 * toRad(geomMeanLongSun)) -
        0.5 * y * y * Math.sin(4 * toRad(geomMeanLongSun)) -
        1.25 * eccentEarthOrbit * eccentEarthOrbit * Math.sin(2 * toRad(geomMeanAnomSun))
    );

  // Hour angle
  const haArg =
    Math.cos(toRad(90.833)) / (Math.cos(toRad(lat)) * Math.cos(toRad(sunDeclin))) -
    Math.tan(toRad(lat)) * Math.tan(toRad(sunDeclin));

  // Clamp for polar regions (though Galicia never has midnight sun)
  const ha = toDeg(Math.acos(Math.max(-1, Math.min(1, haArg))));

  const solarNoon = (720 - 4 * lon - eqOfTime + timezoneOffsetHours * 60) / 1440;
  const sunriseDecimal = solarNoon - (ha * 4) / 1440;
  const sunsetDecimal = solarNoon + (ha * 4) / 1440;

  const formatTime = (decimal: number): string => {
    const totalMinutes = Math.round(decimal * 1440);
    // Normalize to [0, 1440) to handle edge cases near midnight
    const normalized = ((totalMinutes % 1440) + 1440) % 1440;
    const hours = Math.floor(normalized / 60);
    const minutes = normalized % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  };

  const sunriseMinutes = Math.round(sunriseDecimal * 1440);
  const sunsetMinutes = Math.round(sunsetDecimal * 1440);
  const dayLength = sunsetMinutes - sunriseMinutes;

  return {
    sunrise: formatTime(sunriseDecimal),
    sunset: formatTime(sunsetDecimal),
    dayLengthMinutes: dayLength,
  };
}

/**
 * Get the current timezone offset for Galicia (CET/CEST).
 * Spain observes CET (UTC+1) in winter and CEST (UTC+2) in summer.
 */
export function getGaliciaTimezoneOffset(date: Date): number {
  // Last Sunday in March to last Sunday in October = CEST (UTC+2)
  // Use UTC constructors so the result is independent of the server's
  // local timezone — the boundaries are defined in UTC (CET = UTC+1).
  const year = date.getUTCFullYear();

  // March has 31 days.  getUTCDay() returns 0 = Sunday.
  const marchLast = new Date(Date.UTC(year, 2, 31));
  const marchLastSunday = 31 - marchLast.getUTCDay();
  // DST starts at 01:00 UTC (02:00 CET) on the last Sunday of March
  const dstStart = new Date(Date.UTC(year, 2, marchLastSunday, 1, 0, 0));

  const octLast = new Date(Date.UTC(year, 9, 31));
  const octLastSunday = 31 - octLast.getUTCDay();
  // DST ends at 01:00 UTC (03:00 CEST) on the last Sunday of October
  const dstEnd = new Date(Date.UTC(year, 9, octLastSunday, 1, 0, 0));

  return date >= dstStart && date < dstEnd ? 2 : 1;
}
