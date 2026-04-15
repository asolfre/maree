/** Core types for species and biological closure ("paro biológico") data. */

/** Broad taxonomic category for display grouping & filtering. */
export type SpeciesCategory =
  | "shellfish"   // bivalves, gastropods (almeja, berberecho, navaja…)
  | "crustacean"  // centollo, nécora, bogavante, percebe…
  | "finfish"     // merluza, sardina, jurel, anchoa…
  | "cephalopod"; // pulpo, sepia…

/** A species that can be subject to biological closures. */
export interface Species {
  /** URL-safe kebab-case identifier, e.g. "almeja-fina" */
  id: string;
  /** Common name in Spanish/Galician */
  name: string;
  /** Latin binomial */
  scientificName: string;
  /** Taxonomic grouping */
  category: SpeciesCategory;
  /** Material Symbols icon name for visual identification */
  icon: string;
}

/**
 * A known closure (veda / paro biológico) period for a species.
 *
 * Periods are defined as month-day ranges which recur annually,
 * because most Galician biological closures follow a fixed annual calendar
 * (though exact dates may shift slightly each year via DOG resolutions).
 */
export interface ClosurePeriod {
  /** FK to Species.id */
  speciesId: string;
  /** Geographic zone the closure applies to, e.g. "Rías Baixas" */
  zone: string;
  /** Start month-day "MM-DD" (inclusive) */
  startMonthDay: string;
  /** End month-day "MM-DD" (inclusive) */
  endMonthDay: string;
  /** Human-readable reason */
  reason: string;
  /** Legal reference, e.g. "DOG 2024/12345" */
  source: string;
  /** Optional URL to the official publication */
  sourceUrl?: string;
}

/** Resolved closure period with concrete ISO dates for a given year. */
export interface ResolvedClosure {
  /** FK to Species.id */
  speciesId: string;
  zone: string;
  /** ISO date "YYYY-MM-DD" (inclusive start) */
  startDate: string;
  /** ISO date "YYYY-MM-DD" (inclusive end) */
  endDate: string;
  reason: string;
  source: string;
  sourceUrl?: string;
}

/** Current closure status for a species. */
export type ClosureStatus = "closed" | "open" | "closing_soon";

/** Aggregated status for a species at a point in time. */
export interface SpeciesClosureInfo {
  species: Species;
  status: ClosureStatus;
  /** The active closure, if status is "closed" */
  activeClosure: ResolvedClosure | null;
  /** Next upcoming closure (may be null if none scheduled) */
  nextClosure: ResolvedClosure | null;
  /** Days until the next closure starts (null if none) */
  daysUntilNextClosure: number | null;
  /** Days remaining in the active closure (null if not closed) */
  daysRemaining: number | null;
}

/** Response shape from /api/closures */
export interface ClosuresResponse {
  closures: SpeciesClosureInfo[];
  /** ISO timestamp of when this data was generated */
  lastUpdated: string;
  /** Recent DOG feed entries related to fishing */
  dogFeedEntries: DogFeedEntry[];
}

/** A parsed entry from the DOG RSS feed. */
export interface DogFeedEntry {
  title: string;
  /** Publication date ISO string */
  date: string;
  /** Link to full DOG publication */
  url: string;
}
