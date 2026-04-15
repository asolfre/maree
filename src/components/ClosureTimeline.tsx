"use client";

/**
 * Annual closure timeline visualization.
 *
 * Horizontal bar chart:
 * - X-axis: months (Jan–Dec)
 * - Y-axis: species with closure periods
 * - Red bars: closure periods
 * - Green background: open periods
 * - Vertical line: current date
 *
 * Pure CSS/SVG implementation (no D3 dependency).
 */

import type { ResolvedClosure } from "@/lib/species/types";
import { SPECIES } from "@/lib/species/registry";

interface ClosureTimelineProps {
  closures: ResolvedClosure[];
  year: number;
}

const MONTHS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

/** Convert "YYYY-MM-DD" to day-of-year (0-based). */
function dayOfYear(iso: string): number {
  const date = new Date(iso + "T00:00:00Z");
  const startOfYear = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.floor(
    (date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24),
  );
}

/** Total days in a year. */
function daysInYear(year: number): number {
  return (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 366 : 365;
}

export default function ClosureTimeline({
  closures,
  year,
}: ClosureTimelineProps) {
  const totalDays = daysInYear(year);

  // Only show species that have at least one closure
  const speciesWithClosures = SPECIES.filter((sp) =>
    closures.some((c) => c.speciesId === sp.id),
  );

  // Current day marker
  const now = new Date();
  const isCurrentYear = now.getFullYear() === year;
  const currentDayOfYear = isCurrentYear
    ? dayOfYear(now.toISOString().split("T")[0])
    : -1;

  const ROW_HEIGHT = 36;
  const HEADER_HEIGHT = 32;
  const LEFT_MARGIN = 120;
  const svgHeight = HEADER_HEIGHT + speciesWithClosures.length * ROW_HEIGHT + 8;
  const chartWidth = 600;
  const barAreaWidth = chartWidth - LEFT_MARGIN;

  if (speciesWithClosures.length === 0) {
    return (
      <div className="text-sm text-on-surface-variant text-center py-8">
        No hay vedas registradas para {year}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto no-scrollbar">
      <svg
        viewBox={`0 0 ${chartWidth} ${svgHeight}`}
        className="w-full min-w-[500px]"
        role="img"
        aria-label={`Calendario de vedas ${year}`}
      >
        {/* Month labels */}
        {MONTHS.map((label, i) => {
          const monthStart = new Date(Date.UTC(year, i, 1));
          const monthDoy = dayOfYear(monthStart.toISOString().split("T")[0]);
          const x = LEFT_MARGIN + (monthDoy / totalDays) * barAreaWidth;

          return (
            <g key={label}>
              <text
                x={x + 2}
                y={HEADER_HEIGHT - 8}
                className="fill-on-surface-variant text-[9px] font-bold uppercase"
                style={{ fontSize: "9px" }}
              >
                {label}
              </text>
              {/* Month separator line */}
              <line
                x1={x}
                y1={HEADER_HEIGHT}
                x2={x}
                y2={svgHeight}
                className="stroke-outline-variant"
                strokeWidth={0.5}
                strokeDasharray="2 2"
              />
            </g>
          );
        })}

        {/* Species rows */}
        {speciesWithClosures.map((species, rowIndex) => {
          const y = HEADER_HEIGHT + rowIndex * ROW_HEIGHT;
          const speciesClosures = closures.filter(
            (c) => c.speciesId === species.id,
          );

          return (
            <g key={species.id}>
              {/* Row background (alternating) */}
              {rowIndex % 2 === 0 && (
                <rect
                  x={0}
                  y={y}
                  width={chartWidth}
                  height={ROW_HEIGHT}
                  className="fill-surface-container-low"
                  rx={4}
                />
              )}

              {/* Species name */}
              <text
                x={8}
                y={y + ROW_HEIGHT / 2 + 4}
                className="fill-on-surface text-[10px] font-semibold"
                style={{ fontSize: "10px" }}
              >
                {species.name.length > 16
                  ? species.name.slice(0, 14) + "…"
                  : species.name}
              </text>

              {/* Closure bars */}
              {speciesClosures.map((closure, ci) => {
                const startDay = dayOfYear(closure.startDate);
                const endDay = dayOfYear(closure.endDate);
                const barX =
                  LEFT_MARGIN + (startDay / totalDays) * barAreaWidth;
                const barWidth =
                  ((endDay - startDay + 1) / totalDays) * barAreaWidth;

                return (
                  <rect
                    key={ci}
                    x={barX}
                    y={y + 6}
                    width={Math.max(barWidth, 2)}
                    height={ROW_HEIGHT - 12}
                    rx={4}
                    className="fill-error/70"
                  >
                    <title>
                      {species.name}: {closure.startDate} – {closure.endDate}
                      {"\n"}
                      {closure.zone} — {closure.reason}
                    </title>
                  </rect>
                );
              })}
            </g>
          );
        })}

        {/* Current day marker */}
        {isCurrentYear && currentDayOfYear >= 0 && (
          <line
            x1={LEFT_MARGIN + (currentDayOfYear / totalDays) * barAreaWidth}
            y1={HEADER_HEIGHT - 4}
            x2={LEFT_MARGIN + (currentDayOfYear / totalDays) * barAreaWidth}
            y2={svgHeight}
            className="stroke-primary"
            strokeWidth={2}
            strokeLinecap="round"
          />
        )}
      </svg>
    </div>
  );
}
