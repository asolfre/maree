"use client";

import { Suspense, useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import type {
  TidePoint,
  TideExtreme,
  ForecastResponse,
  ForecastCoverage,
} from "@/lib/tides/types";
import { STATIONS } from "@/lib/stations";
import { computeTideAlert } from "@/lib/tides/alerts";
import ForecastDay from "@/components/ForecastDay";

/** Resolve initial station from URL ?station= param, falling back to "vigo" */
function useInitialStation(): string {
  const searchParams = useSearchParams();
  const urlStation = searchParams.get("station");
  if (urlStation && STATIONS.some((s) => s.id === urlStation)) {
    return urlStation;
  }
  return "vigo";
}

function ForecastContent() {
  const initialStation = useInitialStation();
  const [stationId, setStationId] = useState(initialStation);

  // Sync stationId when URL ?station= param changes
  useEffect(() => {
    setStationId(initialStation);
  }, [initialStation]);
  const [forecastExtremes, setForecastExtremes] = useState<TideExtreme[]>([]);
  const [forecastPoints, setForecastPoints] = useState<TidePoint[]>([]);
  const [coverage, setCoverage] = useState<ForecastCoverage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const station = STATIONS.find((s) => s.id === stationId) ?? STATIONS[0];

  // Get list of next 7 days
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const fetchForecast = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/tides/forecast?station=${stationId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ForecastResponse = await res.json();
      setForecastExtremes(data.extremes);
      setForecastPoints(data.points);
      setCoverage(data.coverage ?? []);
    } catch {
      setError("No se pudo cargar la previsión");
    } finally {
      setIsLoading(false);
    }
  }, [stationId]);

  useEffect(() => {
    fetchForecast();
  }, [fetchForecast]);

  // Group extremes by day
  function getExtremesForDay(date: Date): TideExtreme[] {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    return forecastExtremes.filter((e) => {
      const t = new Date(e.time);
      return t >= startOfDay && t < endOfDay;
    });
  }

  // Get forecast points for a specific day (for expandable tide curves)
  function getPointsForDay(date: Date): TidePoint[] {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    return forecastPoints.filter((p) => {
      const t = new Date(p.time);
      return t >= startOfDay && t < endOfDay;
    });
  }

  // Determine what model covers each day
  function getCoverageForDay(date: Date): "mohid" | "roms" | "none" {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);

    // Check if MOHID covers this day
    const mohidCov = coverage.find((c) => c.model !== "roms_2km");
    if (mohidCov) {
      const mohidTo = new Date(mohidCov.to);
      if (dayStart < mohidTo) return "mohid";
    }

    // Check if ROMS covers this day
    const romsCov = coverage.find((c) => c.model === "roms_2km");
    if (romsCov) {
      const romsTo = new Date(romsCov.to);
      if (dayStart < romsTo) return "roms";
    }

    return "none";
  }

  // Model display names
  const modelNames = coverage.map((c) => {
    if (c.model === "roms_2km") return "ROMS 2km";
    return `MOHID (${c.model.replace("mohid_", "").toUpperCase()})`;
  });

  // Data-driven tide alert based on lunar phase + tidal range
  const tideAlert = useMemo(
    () => computeTideAlert(forecastExtremes, new Date()),
    [forecastExtremes]
  );

  return (
    <div className="max-w-7xl mx-auto px-6 pt-12 pb-8">
      {/* Hero Header Section */}
      <section className="mb-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-secondary font-bold tracking-widest uppercase text-xs">
              <span className="w-8 h-[2px] bg-secondary" />
              Costa Gallega
            </div>
            <h1 className="font-headline font-extrabold text-6xl md:text-8xl tracking-tighter text-primary leading-none">
              Previsión<br />Semanal.
            </h1>
          </div>
          <div className="bg-surface-container-low p-8 rounded-xl max-w-sm w-full">
            <p className="font-headline text-2xl font-bold text-primary mb-2">
              {station.name}
            </p>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary">
                  water_drop
                </span>
                <span className="font-semibold text-on-surface-variant text-sm">
                  {modelNames.length > 0
                    ? modelNames.join(" + ")
                    : station.mohidModel
                      ? `MOHID (${station.mohidModel.replace("mohid_", "").toUpperCase()})`
                      : "ROMS 2km"}
                </span>
              </div>
              <select
                value={stationId}
                onChange={(e) => setStationId(e.target.value)}
                className="px-3 py-1.5 bg-surface-container rounded-full text-xs font-label text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {STATIONS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.shortName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Coverage indicator */}
      {!isLoading && !error && coverage.length > 0 && (
        <section className="mb-10">
          <div className="flex flex-wrap gap-3">
            {coverage.map((c) => {
              const from = new Date(c.from);
              const to = new Date(c.to);
              const hoursSpan = Math.round(
                (to.getTime() - from.getTime()) / (1000 * 60 * 60)
              );
              const modelLabel =
                c.model === "roms_2km"
                  ? "ROMS 2km"
                  : `MOHID ${c.model.replace("mohid_", "").toUpperCase()}`;
              const isRoms = c.model === "roms_2km";
              return (
                <div
                  key={c.model}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider ${
                    isRoms
                      ? "bg-tertiary-container text-on-tertiary-container"
                      : "bg-secondary-container text-on-secondary-container"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isRoms ? "bg-tertiary" : "bg-secondary"
                    }`}
                  />
                  {modelLabel} — {hoursSpan}h cobertura
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="text-center py-16 text-on-surface-variant">
          <span className="material-symbols-outlined text-4xl mb-3 block">
            cloud_off
          </span>
          <p className="text-sm mb-2">{error}</p>
          <button
            onClick={fetchForecast}
            className="text-xs text-primary font-semibold"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Forecast Bento Grid */}
      {!isLoading && !error && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-24">
            {days.map((day, i) => {
              const dayCoverage = getCoverageForDay(day);
              return (
                <ForecastDay
                  key={day.toISOString()}
                  date={day}
                  extremes={getExtremesForDay(day)}
                  points={getPointsForDay(day)}
                  dayIndex={i}
                  coverageSource={dayCoverage}
                />
              );
            })}

            {/* Alert Card — only shown when lunar phase warrants it */}
            {tideAlert && (
              <div
                className={`rounded-xl p-6 flex items-center gap-4 ${
                  tideAlert.severity === "high"
                    ? "bg-error text-on-error"
                    : tideAlert.severity === "moderate"
                      ? "bg-tertiary text-white"
                      : "bg-secondary-container text-on-secondary-container"
                }`}
              >
                <div
                  className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${
                    tideAlert.severity === "info"
                      ? "bg-secondary/20"
                      : "bg-surface-container-lowest/20"
                  }`}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {tideAlert.icon}
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-sm uppercase tracking-wider">
                    {tideAlert.title}
                  </h4>
                  <p
                    className={`text-xs ${
                      tideAlert.severity === "info"
                        ? "text-on-secondary-container/80"
                        : "text-white/80"
                    }`}
                  >
                    {tideAlert.message}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Hourly Convergence Table */}
          <section className="mb-8">
            <h2 className="font-headline text-3xl font-extrabold text-primary mb-8">
              Tabla horaria
            </h2>
            <div className="overflow-x-auto pb-4">
              <table className="w-full min-w-[640px] text-left border-collapse">
                <thead>
                  <tr className="text-on-surface-variant font-label text-[10px] uppercase tracking-[0.2em] border-b border-surface-container-high">
                    <th className="py-4 px-2 font-black">Hora</th>
                    <th className="py-4 px-2 font-black">Tipo</th>
                    <th className="py-4 px-2 font-black">Altura</th>
                    <th className="py-4 px-2 font-black">Patrón</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container">
                  {forecastExtremes.slice(0, 8).map((ext, i) => {
                    const isHigh = ext.type === "high";
                    const barWidth = Math.max(
                      15,
                      Math.min(100, (ext.height / 5) * 100)
                    );
                    return (
                      <tr
                        key={i}
                        className="hover:bg-surface-container-low transition-colors"
                      >
                        <td className="py-6 px-2 font-headline font-bold text-lg">
                          {new Date(ext.time).toLocaleTimeString("es-ES", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-6 px-2">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-bold uppercase ${
                              isHigh ? "text-secondary" : "text-tertiary"
                            }`}
                          >
                            <span className="material-symbols-outlined text-sm">
                              {isHigh ? "arrow_upward" : "arrow_downward"}
                            </span>
                            {isHigh ? "Pleamar" : "Bajamar"}
                          </span>
                        </td>
                        <td
                          className={`py-6 px-2 font-headline font-bold text-2xl ${
                            isHigh ? "text-secondary" : "text-tertiary"
                          }`}
                        >
                          {ext.height.toFixed(2)}m
                        </td>
                        <td className="py-6 px-2">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-4 bg-surface-container-highest rounded-full overflow-hidden relative">
                              <div
                                className={`absolute left-0 top-0 h-full rounded-full ${
                                  isHigh ? "bg-secondary" : "bg-tertiary"
                                }`}
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-on-surface-variant uppercase">
                              {ext.height > 3
                                ? "Alta"
                                : ext.height > 1.5
                                  ? "Media"
                                  : "Baja"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default function ForecastPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-6 pt-12 pb-8 flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      }
    >
      <ForecastContent />
    </Suspense>
  );
}
