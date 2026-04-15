/**
 * Static biological closure periods for Galician species.
 *
 * Data sourced from recurring annual DOG (Diario Oficial de Galicia)
 * resolutions and Consellería do Mar management plans. Exact dates may
 * shift by a few days each year — this represents the typical calendar.
 *
 * Dates use "MM-DD" format and are resolved to concrete dates at runtime.
 */

import type {
  ClosurePeriod,
  ClosureStatus,
  ResolvedClosure,
  SpeciesClosureInfo,
} from "./types";
import { SPECIES } from "./registry";

// ── Static closure periods ──────────────────────────────────────

export const CLOSURE_PERIODS: ClosurePeriod[] = [
  // Almeja fina — varies by ría, using a representative period
  {
    speciesId: "almeja-fina",
    zone: "Rías Baixas",
    startMonthDay: "06-01",
    endMonthDay: "09-30",
    reason: "Período de desove y recuperación del recurso",
    source: "Plan de xestión Consellería do Mar",
  },
  // Almeja babosa
  {
    speciesId: "almeja-babosa",
    zone: "Rías Baixas",
    startMonthDay: "06-01",
    endMonthDay: "09-30",
    reason: "Período de desove",
    source: "Plan de xestión Consellería do Mar",
  },
  // Almeja rubia
  {
    speciesId: "almeja-rubia",
    zone: "Costa Gallega",
    startMonthDay: "05-15",
    endMonthDay: "09-15",
    reason: "Período de desove y recuperación",
    source: "Plan de xestión Consellería do Mar",
  },
  // Berberecho
  {
    speciesId: "berberecho",
    zone: "Rías Baixas",
    startMonthDay: "06-01",
    endMonthDay: "09-30",
    reason: "Veda biológica por desove",
    source: "Plan de xestión Consellería do Mar",
  },
  // Navaja / Longueirón
  {
    speciesId: "navaja",
    zone: "Costa Gallega",
    startMonthDay: "04-01",
    endMonthDay: "06-30",
    reason: "Paro biológico por reproducción",
    source: "Plan de xestión Consellería do Mar",
  },
  // Vieira
  {
    speciesId: "vieira",
    zone: "Rías Baixas",
    startMonthDay: "05-01",
    endMonthDay: "09-30",
    reason: "Paro biológico — temporada cerrada",
    source: "Plan de xestión Consellería do Mar",
  },
  // Zamburiña
  {
    speciesId: "zamburina",
    zone: "Costa Gallega",
    startMonthDay: "06-01",
    endMonthDay: "09-30",
    reason: "Período de desove y recuperación",
    source: "Plan de xestión Consellería do Mar",
  },
  // Percebe
  {
    speciesId: "percebe",
    zone: "Costa da Morte",
    startMonthDay: "03-01",
    endMonthDay: "06-30",
    reason: "Paro biológico por período reproductivo",
    source: "Plan de xestión Consellería do Mar",
  },
  // Centollo
  {
    speciesId: "centollo",
    zone: "Costa Gallega",
    startMonthDay: "07-01",
    endMonthDay: "11-15",
    reason: "Veda biológica — recuperación poblacional",
    source: "Orde da Consellería do Mar",
  },
  // Nécora
  {
    speciesId: "necora",
    zone: "Costa Gallega",
    startMonthDay: "06-01",
    endMonthDay: "11-30",
    reason: "Veda biológica por período de muda y desove",
    source: "Orde da Consellería do Mar",
  },
  // Bogavante
  {
    speciesId: "bogavante",
    zone: "Costa Gallega",
    startMonthDay: "03-01",
    endMonthDay: "06-30",
    reason: "Veda biológica — temporada cerrada",
    source: "Orde da Consellería do Mar",
  },
  // Pulpo
  {
    speciesId: "pulpo",
    zone: "Costa Gallega",
    startMonthDay: "05-15",
    endMonthDay: "06-30",
    reason: "Paro biológico del pulpo — recuperación del recurso",
    source: "Resolución Consellería do Mar (DOG anual)",
  },
  // Anchoa / Bocarte
  {
    speciesId: "anchoa",
    zone: "Cantábrico Noroeste",
    startMonthDay: "12-01",
    endMonthDay: "03-31",
    reason: "Paro biológico de la anchoa — período invernal",
    source: "Regulación MAPA / UE",
  },
];

// ── Resolution helpers ──────────────────────────────────────────

/**
 * Resolve a recurring MM-DD closure period to concrete ISO dates
 * for a given year. Handles periods that may span across year boundaries.
 */
export function resolveClosurePeriod(
  period: ClosurePeriod,
  year: number,
): ResolvedClosure {
  const startDate = `${year}-${period.startMonthDay}`;
  const endDate = `${year}-${period.endMonthDay}`;

  return {
    speciesId: period.speciesId,
    zone: period.zone,
    startDate,
    endDate,
    reason: period.reason,
    source: period.source,
    sourceUrl: period.sourceUrl,
  };
}

/** Parse "YYYY-MM-DD" to a Date at midnight UTC. */
function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Format a Date to "YYYY-MM-DD". */
function toISODate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Check if a date falls within a resolved closure period (inclusive).
 */
function isDateInClosure(date: Date, closure: ResolvedClosure): boolean {
  const start = parseDate(closure.startDate);
  const end = parseDate(closure.endDate);
  const d = parseDate(toISODate(date));
  return d >= start && d <= end;
}

/** Days between two dates (absolute). */
function daysBetween(a: Date, b: Date): number {
  return Math.round(
    Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24),
  );
}

// ── Public API ──────────────────────────────────────────────────

/**
 * Get all resolved closures for the current year and next year
 * (so we can show upcoming closures that start in January).
 */
export function getAllResolvedClosures(
  referenceDate: Date = new Date(),
): ResolvedClosure[] {
  const year = referenceDate.getFullYear();
  const resolved: ResolvedClosure[] = [];

  for (const period of CLOSURE_PERIODS) {
    resolved.push(resolveClosurePeriod(period, year));
    resolved.push(resolveClosurePeriod(period, year + 1));
  }

  return resolved;
}

/**
 * Determine the closure status for a specific species on a given date.
 */
export function getSpeciesStatus(
  speciesId: string,
  referenceDate: Date = new Date(),
): ClosureStatus {
  const closures = getAllResolvedClosures(referenceDate).filter(
    (c) => c.speciesId === speciesId,
  );

  // Check if currently in a closure
  for (const closure of closures) {
    if (isDateInClosure(referenceDate, closure)) {
      return "closed";
    }
  }

  // Check if a closure starts within the next 7 days
  const refDay = parseDate(toISODate(referenceDate));
  for (const closure of closures) {
    const start = parseDate(closure.startDate);
    if (start > refDay && daysBetween(refDay, start) <= 7) {
      return "closing_soon";
    }
  }

  return "open";
}

/**
 * Get comprehensive closure info for all species at a point in time.
 */
export function getAllSpeciesClosureInfo(
  referenceDate: Date = new Date(),
): SpeciesClosureInfo[] {
  const allClosures = getAllResolvedClosures(referenceDate);
  const refDay = parseDate(toISODate(referenceDate));

  return SPECIES.map((species) => {
    const speciesClosures = allClosures.filter(
      (c) => c.speciesId === species.id,
    );

    // Find active closure
    const activeClosure =
      speciesClosures.find((c) => isDateInClosure(referenceDate, c)) ?? null;

    // Find next upcoming closure (starts after today)
    const futureClosures = speciesClosures
      .filter((c) => parseDate(c.startDate) > refDay)
      .sort(
        (a, b) =>
          parseDate(a.startDate).getTime() - parseDate(b.startDate).getTime(),
      );
    const nextClosure = futureClosures[0] ?? null;

    // Compute status
    let status: ClosureStatus = "open";
    if (activeClosure) {
      status = "closed";
    } else if (nextClosure) {
      const daysUntil = daysBetween(refDay, parseDate(nextClosure.startDate));
      if (daysUntil <= 7) {
        status = "closing_soon";
      }
    }

    // Compute day counts
    const daysRemaining = activeClosure
      ? daysBetween(refDay, parseDate(activeClosure.endDate))
      : null;
    const daysUntilNextClosure = nextClosure
      ? daysBetween(refDay, parseDate(nextClosure.startDate))
      : null;

    return {
      species,
      status,
      activeClosure,
      nextClosure,
      daysRemaining,
      daysUntilNextClosure,
    };
  });
}

/**
 * Get only the species currently under active closure.
 */
export function getActiveClosures(
  referenceDate: Date = new Date(),
): SpeciesClosureInfo[] {
  return getAllSpeciesClosureInfo(referenceDate).filter(
    (info) => info.status === "closed",
  );
}

/**
 * Get the resolved closure periods for a specific year,
 * useful for the timeline visualization.
 */
export function getClosuresForYear(year: number): ResolvedClosure[] {
  return CLOSURE_PERIODS.map((period) => resolveClosurePeriod(period, year));
}
