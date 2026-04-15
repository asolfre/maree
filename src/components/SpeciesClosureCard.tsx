"use client";

/**
 * Summary card for the home page bento grid.
 *
 * Shows a compact overview of biological closure status:
 * - Number of species currently under ban
 * - Next upcoming closure (if any)
 * - Link to the full /vedas page
 *
 * Follows the same editorial card pattern as WindCard, MarineCard, etc.
 */

import Link from "next/link";
import type { SpeciesClosureInfo } from "@/lib/species/types";

interface SpeciesClosureCardProps {
  closureInfo: SpeciesClosureInfo[];
  isLoading?: boolean;
}

export default function SpeciesClosureCard({
  closureInfo,
  isLoading,
}: SpeciesClosureCardProps) {
  const closedSpecies = closureInfo.filter((c) => c.status === "closed");
  const closingSoonSpecies = closureInfo.filter(
    (c) => c.status === "closing_soon",
  );

  // Find the nearest upcoming closure
  const nextClosing = closureInfo
    .filter(
      (c) => c.daysUntilNextClosure !== null && c.daysUntilNextClosure > 0,
    )
    .sort(
      (a, b) => (a.daysUntilNextClosure ?? 999) - (b.daysUntilNextClosure ?? 999),
    )[0];

  return (
    <Link
      href="/vedas"
      className="bg-surface-container-lowest p-8 rounded-2xl flex flex-col justify-between h-64 group hover:shadow-xl transition-all duration-500"
    >
      <div className="flex justify-between items-start">
        <span
          className="material-symbols-outlined text-error text-3xl"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          gavel
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
          Vedas
        </span>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div
            className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin"
            role="status"
            aria-label="Cargando datos de vedas"
          />
        </div>
      ) : (
        <div>
          {/* Active closures count */}
          <div className="text-4xl font-headline font-extrabold text-primary">
            {closedSpecies.length}
            <span className="text-lg font-bold text-outline ml-2">
              {closedSpecies.length === 1 ? "veda" : "vedas"}
            </span>
          </div>

          {/* Closing soon warning */}
          {closingSoonSpecies.length > 0 && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="material-symbols-outlined text-sm text-tertiary">
                schedule
              </span>
              <span className="text-xs text-on-surface-variant">
                {closingSoonSpecies.length} próxima
                {closingSoonSpecies.length > 1 ? "s" : ""}
              </span>
            </div>
          )}

          {/* Next upcoming closure */}
          {nextClosing && closedSpecies.length === 0 && (
            <div className="flex items-center gap-2 mt-2">
              <span className="material-symbols-outlined text-sm text-secondary">
                event
              </span>
              <span className="text-xs text-on-surface-variant truncate">
                Próxima: {nextClosing.species.name}
                {nextClosing.daysUntilNextClosure !== null &&
                  ` en ${nextClosing.daysUntilNextClosure}d`}
              </span>
            </div>
          )}

          {/* First few closed species names */}
          {closedSpecies.length > 0 && (
            <div className="text-xs text-on-surface-variant mt-1.5 truncate">
              {closedSpecies
                .slice(0, 3)
                .map((c) => c.species.name)
                .join(", ")}
              {closedSpecies.length > 3 &&
                ` +${closedSpecies.length - 3} más`}
            </div>
          )}
        </div>
      )}
    </Link>
  );
}
