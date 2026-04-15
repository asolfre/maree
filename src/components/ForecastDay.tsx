"use client";

import { useState } from "react";
import type { TideExtreme, TidePoint } from "@/lib/tides/types";
import TideCurve from "@/components/TideCurve";

interface ForecastDayProps {
  date: Date;
  extremes: TideExtreme[];
  /** Forecast time-series points for this day (for expandable chart) */
  points?: TidePoint[];
  dayIndex: number;
  /** Which forecast model covers this day */
  coverageSource?: "mohid" | "roms" | "none";
}

/**
 * SparklineBar: minimalist bar graph representing tide variation over the day.
 * Each bar represents a segment of the day's tide pattern.
 */
function SparklineBar({ extremes }: { extremes: TideExtreme[] }) {
  // Generate 7 bars based on extremes data
  const heights = [0.2, 0.4, 0.7, 1, 0.8, 0.5, 0.3];

  if (extremes.length > 0) {
    const maxH = Math.max(...extremes.map((e) => e.height));
    const minH = Math.min(...extremes.map((e) => e.height));
    const range = maxH - minH || 1;
    // Distribute across 7 bars
    extremes.forEach((e, i) => {
      if (i < 7) {
        heights[i] = 0.15 + ((e.height - minH) / range) * 0.85;
      }
    });
  }

  return (
    <div className="h-16 w-full flex items-end gap-[2px]">
      {heights.map((h, i) => (
        <div
          key={i}
          className="flex-1 bg-primary rounded-t-sm"
          style={{ height: `${h * 100}%`, opacity: 0.2 + h * 0.8 }}
        />
      ))}
    </div>
  );
}

export default function ForecastDay({
  date,
  extremes,
  points = [],
  dayIndex,
  coverageSource = "mohid",
}: ForecastDayProps) {
  const [expanded, setExpanded] = useState(false);
  const dayName = date.toLocaleDateString("es-ES", { weekday: "long" });
  const isToday = dayIndex === 0;
  const isWeekend = date.getDay() === 6 || date.getDay() === 0; // Sat or Sun gets special treatment
  const noCoverage = coverageSource === "none" && extremes.length === 0;
  const hasChartData = points.length >= 2;

  const highs = extremes.filter((e) => e.type === "high");
  const maxHeight = highs.length > 0 ? Math.max(...highs.map((e) => e.height)) : 0;
  const displayHeight = maxHeight > 0 ? maxHeight.toFixed(1) : "--";

  // No coverage — beyond model forecast window
  if (noCoverage && !isToday && !isWeekend) {
    return (
      <div className="bg-surface-container-low rounded-xl p-6 flex flex-col justify-between opacity-50">
        <div>
          <div className="flex justify-between items-start mb-4">
            <span className="font-label font-bold text-[10px] uppercase tracking-widest text-on-surface-variant capitalize">
              {dayName}
            </span>
            <span className="text-xs text-on-surface-variant">
              {date.toLocaleDateString("es-ES", {
                day: "numeric",
                month: "short",
              })}
            </span>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-on-surface-variant text-xl">
              cloud_off
            </span>
            <span className="text-xs text-on-surface-variant font-semibold">
              Sin cobertura
            </span>
          </div>
          <p className="text-[10px] text-on-surface-variant">
            Los modelos no cubren este día. MOHID: 48h, ROMS: 96h.
          </p>
        </div>
      </div>
    );
  }

  /** Small model source badge. */
  const modelBadge =
    coverageSource === "roms" ? (
      <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-on-tertiary-container bg-tertiary-container px-2 py-0.5 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
        ROMS
      </span>
    ) : coverageSource === "mohid" ? (
      <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-on-secondary-container bg-secondary-container px-2 py-0.5 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
        MOHID
      </span>
    ) : null;

  // Featured card (Day 1 / Today)
  if (isToday) {
    return (
      <div className="md:col-span-2 md:row-span-2 bg-surface-container-lowest rounded-xl p-8 flex flex-col justify-between relative overflow-hidden group shadow-[0_8px_24px_rgba(0,42,72,0.06)] border border-outline-variant/10">
        <div className="z-10">
          <div className="flex justify-between items-start mb-12">
            <div>
              <p className="font-label font-bold text-xs uppercase tracking-[0.2em] text-on-surface-variant mb-1">
                Hoy
              </p>
              <h2 className="font-headline text-4xl font-extrabold text-primary capitalize">
                {dayName}
              </h2>
            </div>
            {extremes.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="bg-secondary-container text-on-secondary-container px-4 py-2 rounded-full font-bold text-xs uppercase">
                  {maxHeight > 3 ? "Marea alta" : "Favorable"}
                </div>
                {modelBadge}
              </div>
            )}
          </div>
          <div className="flex items-baseline gap-2 mb-8">
            <span className="font-headline text-8xl font-black text-primary leading-none">
              {displayHeight}
            </span>
            <span className="font-label font-bold text-lg text-on-surface-variant uppercase">
              M
            </span>
            {highs.length > 0 && (
              <span className="material-symbols-outlined text-tertiary text-4xl ml-2">
                north_east
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-container-low p-4 rounded-lg">
              <span className="material-symbols-outlined text-primary mb-2 block">
                waves
              </span>
              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                Pleamares
              </p>
              <p className="font-headline text-xl font-bold">
                {highs.length > 0
                  ? `${highs[0].height.toFixed(1)}m @ ${new Date(highs[0].time).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`
                  : "Sin datos"}
              </p>
            </div>
            <div className="bg-surface-container-low p-4 rounded-lg">
              <span className="material-symbols-outlined text-primary mb-2 block">
                air
              </span>
              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                Bajamares
              </p>
              <p className="font-headline text-xl font-bold">
                {extremes.filter((e) => e.type === "low").length > 0
                  ? `${extremes.filter((e) => e.type === "low")[0].height.toFixed(1)}m`
                  : "Sin datos"}
              </p>
            </div>
          </div>

          {/* Expandable tide curve for Today */}
          {hasChartData && (
            <div className="mt-6">
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-on-surface-variant hover:text-primary transition-colors mb-3"
                aria-expanded={expanded}
              >
                <span
                  className="material-symbols-outlined text-sm transition-transform"
                  style={{
                    transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                >
                  expand_more
                </span>
                {expanded ? "Ocultar curva" : "Ver curva de mareas"}
              </button>
              {expanded && (
                <div className="bg-surface-container-low rounded-xl p-4">
                  <TideCurve
                    points={points}
                    extremes={extremes}
                    view="today"
                    currentTime={new Date()}
                    height={180}
                  />
                </div>
              )}
            </div>
          )}
        </div>
        {/* SVG Wave Visualization */}
        <div className="absolute bottom-0 left-0 w-full h-1/3 opacity-20 pointer-events-none">
          <svg
            className="w-full h-full"
            preserveAspectRatio="none"
            viewBox="0 0 400 150"
          >
            <path
              className="fill-primary"
              d="M0 80 C 100 20, 200 140, 400 80 L 400 150 L 0 150 Z"
            />
          </svg>
        </div>
      </div>
    );
  }

  // Saturday wide card
  if (isWeekend) {
    return (
      <div className="md:col-span-2 bg-primary text-on-primary rounded-xl p-8 relative overflow-hidden group shadow-xl">
        <div className="relative z-10">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2 font-bold tracking-widest uppercase text-[10px] mb-2 text-primary-fixed-dim">
                Fin de semana
              </div>
              <h3 className="font-headline text-4xl font-extrabold mb-1 capitalize">
                {dayName}
              </h3>
              <p className="font-medium max-w-xs text-on-primary-container">
                Previsión detallada para el fin de semana.
              </p>
            </div>
            <div className="text-right">
              <span className="font-headline text-7xl font-black block">
                {displayHeight}
              </span>
              <span className="font-label font-bold text-sm uppercase tracking-widest text-primary-fixed-dim">
                Max Marea
              </span>
            </div>
          </div>

          {/* Expandable tide curve for weekend */}
          {hasChartData && (
            <div className="mt-6">
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-on-primary/70 hover:text-on-primary transition-colors mb-3"
                aria-expanded={expanded}
              >
                <span
                  className="material-symbols-outlined text-sm transition-transform"
                  style={{
                    transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                >
                  expand_more
                </span>
                {expanded ? "Ocultar curva" : "Ver curva de mareas"}
              </button>
              {expanded && (
                <div className="bg-surface-container-lowest/10 backdrop-blur-sm rounded-xl p-4">
                  <TideCurve
                    points={points}
                    extremes={extremes}
                    view="today"
                    currentTime={new Date()}
                    height={160}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Regular day card with sparkline
  return (
    <div className="bg-surface-container-low rounded-xl p-6 flex flex-col justify-between hover:bg-surface-container transition-colors">
      <div>
        <div className="flex justify-between items-start mb-4">
          <span className="font-label font-bold text-[10px] uppercase tracking-widest text-on-surface-variant capitalize">
            {dayName}
          </span>
          <div className="flex items-center gap-2">
            {modelBadge}
            <span className="text-xs text-on-surface-variant">
              {date.toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
            </span>
          </div>
        </div>
        <div className="flex items-baseline gap-1 mb-4">
          <span className="font-headline text-4xl font-bold text-primary">
            {displayHeight}
          </span>
          <span className="font-label font-bold text-[10px] text-on-surface-variant uppercase">
            M
          </span>
        </div>

        {/* Sparkline or expanded tide curve */}
        {expanded && hasChartData ? (
          <div className="bg-surface-container-lowest rounded-xl p-3">
            <TideCurve
              points={points}
              extremes={extremes}
              view="today"
              currentTime={new Date()}
              height={140}
            />
          </div>
        ) : (
          <SparklineBar extremes={extremes} />
        )}
      </div>
      <div className="mt-4 flex justify-between items-center">
        <div className="flex gap-4 text-[11px] font-bold uppercase tracking-tighter text-on-surface-variant">
          <span>
            {highs.length > 0
              ? `Pleamar ${highs[0].height.toFixed(1)}m`
              : "Sin pleamar"}
          </span>
          <span>
            {extremes.filter((e) => e.type === "low").length > 0
              ? `Bajamar ${extremes.filter((e) => e.type === "low")[0].height.toFixed(1)}m`
              : ""}
          </span>
        </div>
        {hasChartData && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-on-surface-variant hover:text-primary transition-colors"
            aria-label={expanded ? "Ocultar curva" : "Ver curva de mareas"}
            aria-expanded={expanded}
          >
            <span
              className="material-symbols-outlined text-lg transition-transform"
              style={{
                transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              }}
            >
              expand_more
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
