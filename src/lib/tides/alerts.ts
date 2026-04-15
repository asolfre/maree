import type { TideExtreme } from "./types";

export interface TideAlert {
  title: string;
  message: string;
  icon: string;
  severity: "high" | "moderate" | "info";
}

/**
 * Compute lunar phase as 0-1 fraction (0 = new moon, 0.5 = full moon).
 * Uses the standard synodic month approximation from a known new moon reference.
 */
export function getLunarPhase(date: Date): number {
  // Reference new moon: 2000-01-06 18:14 UTC
  const REF_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14, 0);
  const SYNODIC_MONTH_MS = 29.53058868 * 86_400_000;
  const elapsed = date.getTime() - REF_NEW_MOON_MS;
  const phase =
    ((elapsed % SYNODIC_MONTH_MS) + SYNODIC_MONTH_MS) % SYNODIC_MONTH_MS;
  return phase / SYNODIC_MONTH_MS;
}

/**
 * Determine a data-driven tide alert based on lunar phase and observed tidal range.
 * Spring tides (new/full moon): larger tidal ranges.
 * Neap tides (quarter moons): smaller tidal ranges.
 */
export function computeTideAlert(
  extremes: TideExtreme[],
  referenceDate: Date
): TideAlert | null {
  const phase = getLunarPhase(referenceDate);

  // Distance from nearest new (0) or full (0.5) moon — 0 = exact spring tide
  const springDist = Math.min(phase, Math.abs(phase - 0.5), 1 - phase);
  const isNearSpringTide = springDist < 0.1; // within ~3 days of new/full moon
  const isNearNewMoon = phase < 0.1 || phase > 0.9;
  const isNearFullMoon = Math.abs(phase - 0.5) < 0.1;

  // Distance from quarter moons (0.25, 0.75) — 0 = exact neap tide
  const neapDist = Math.min(
    Math.abs(phase - 0.25),
    Math.abs(phase - 0.75)
  );
  const isNearNeapTide = neapDist < 0.1;

  // Check for unusually large tidal range in the forecast data
  const highs = extremes.filter((e) => e.type === "high");
  const lows = extremes.filter((e) => e.type === "low");
  const maxHigh =
    highs.length > 0 ? Math.max(...highs.map((e) => e.height)) : 0;
  const minLow =
    lows.length > 0 ? Math.min(...lows.map((e) => e.height)) : 0;
  const tidalRange = maxHigh - minLow;

  // Spring tide alert — large ranges
  if (isNearSpringTide && tidalRange > 3.0) {
    const moonType = isNearNewMoon ? "luna nueva" : "luna llena";
    return {
      title: "Mareas vivas",
      message: `Rango mareal de ${tidalRange.toFixed(1)}m previsto. Variaciones mayores de lo habitual por ${moonType}. Precaución en zonas costeras de baja cota.`,
      icon: "notifications_active",
      severity: "high",
    };
  }

  if (isNearSpringTide) {
    const moonType = isNearNewMoon ? "luna nueva" : "luna llena";
    return {
      title: "Mareas vivas",
      message: `Período de mareas vivas por ${moonType}. Las variaciones de marea pueden ser mayores de lo habitual esta semana.`,
      icon: "notifications_active",
      severity: "moderate",
    };
  }

  // Neap tide info
  if (isNearNeapTide) {
    return {
      title: "Mareas muertas",
      message: `Período de mareas muertas (cuarto lunar). Rango mareal reducido (${tidalRange.toFixed(1)}m). Condiciones estables para actividades costeras.`,
      icon: "wb_twilight",
      severity: "info",
    };
  }

  return null;
}
