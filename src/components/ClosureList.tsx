"use client";

/**
 * Full species closure list for the /vedas page.
 *
 * Displays all tracked species with their closure status,
 * filterable by category. Each row shows species name,
 * scientific name, status badge, and closure dates.
 */

import { useState } from "react";
import type { SpeciesClosureInfo, SpeciesCategory } from "@/lib/species/types";
import ClosureStatusBadge from "./ClosureStatusBadge";

interface ClosureListProps {
  closureInfo: SpeciesClosureInfo[];
}

const CATEGORY_LABELS: Record<SpeciesCategory | "all", string> = {
  all: "Todos",
  shellfish: "Marisco",
  crustacean: "Crustáceos",
  finfish: "Peces",
  cephalopod: "Cefalópodos",
};

const CATEGORY_ORDER: (SpeciesCategory | "all")[] = [
  "all",
  "shellfish",
  "crustacean",
  "finfish",
  "cephalopod",
];

/** Format "YYYY-MM-DD" to "DD MMM" in Spanish. */
function formatShortDate(iso: string): string {
  const date = new Date(iso + "T00:00:00Z");
  return date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export default function ClosureList({ closureInfo }: ClosureListProps) {
  const [filter, setFilter] = useState<SpeciesCategory | "all">("all");

  const filtered =
    filter === "all"
      ? closureInfo
      : closureInfo.filter((c) => c.species.category === filter);

  // Sort: closed first, then closing_soon, then open
  const statusOrder: Record<string, number> = {
    closed: 0,
    closing_soon: 1,
    open: 2,
  };
  const sorted = [...filtered].sort(
    (a, b) => (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3),
  );

  return (
    <div>
      {/* Category filter tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4">
        {CATEGORY_ORDER.map((cat) => {
          const count =
            cat === "all"
              ? closureInfo.length
              : closureInfo.filter((c) => c.species.category === cat).length;

          return (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
                filter === cat
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
              }`}
            >
              {CATEGORY_LABELS[cat]}{" "}
              <span className="opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Species list */}
      <div className="space-y-3">
        {sorted.map((info) => (
          <div
            key={info.species.id}
            className="bg-surface-container-lowest rounded-2xl p-5 flex items-center gap-4 group hover:shadow-md transition-all duration-300"
          >
            {/* Icon */}
            <div
              className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${
                info.status === "closed"
                  ? "bg-error-container"
                  : info.status === "closing_soon"
                    ? "bg-tertiary-container"
                    : "bg-secondary-container"
              }`}
            >
              <span
                className={`material-symbols-outlined text-xl ${
                  info.status === "closed"
                    ? "text-on-error-container"
                    : info.status === "closing_soon"
                      ? "text-on-tertiary-container"
                      : "text-on-secondary-container"
                }`}
              >
                {info.species.icon}
              </span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-sm text-on-surface">
                  {info.species.name}
                </h4>
                <ClosureStatusBadge
                  status={info.status}
                  days={info.status === "closed" ? info.daysRemaining : info.daysUntilNextClosure}
                  compact
                />
              </div>
              <p className="text-xs text-on-surface-variant italic mt-0.5">
                {info.species.scientificName}
              </p>

              {/* Closure details */}
              {info.activeClosure && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="material-symbols-outlined text-xs text-error">
                    event_busy
                  </span>
                  <span className="text-xs text-on-surface-variant">
                    {formatShortDate(info.activeClosure.startDate)} –{" "}
                    {formatShortDate(info.activeClosure.endDate)}
                    <span className="mx-1.5 opacity-40">·</span>
                    {info.activeClosure.zone}
                  </span>
                </div>
              )}

              {!info.activeClosure && info.nextClosure && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="material-symbols-outlined text-xs text-secondary">
                    event
                  </span>
                  <span className="text-xs text-on-surface-variant">
                    Próxima veda: {formatShortDate(info.nextClosure.startDate)} –{" "}
                    {formatShortDate(info.nextClosure.endDate)}
                    <span className="mx-1.5 opacity-40">·</span>
                    {info.nextClosure.zone}
                  </span>
                </div>
              )}

              {info.activeClosure && (
                <p className="text-[11px] text-on-surface-variant/70 mt-1">
                  {info.activeClosure.reason}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
