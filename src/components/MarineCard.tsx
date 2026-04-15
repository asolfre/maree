"use client";

/**
 * Marine conditions card for the bento grid.
 * Editorial design: col-span-2, gradient background with wave texture, h-64.
 * Displays live marine data from Open-Meteo.
 */

import { visibilityLabel } from "@/lib/openmeteo";

interface MarineCardProps {
  waveHeight: number | null;
  wavePeriod: number | null;
  seaTemp: number | null;
  visibility: number | null;
  isLoading?: boolean;
}

export default function MarineCard({
  waveHeight,
  wavePeriod,
  seaTemp,
  visibility,
  isLoading,
}: MarineCardProps) {
  const hasData =
    waveHeight !== null ||
    seaTemp !== null ||
    visibility !== null;

  const visLabel = visibility !== null ? visibilityLabel(visibility) : null;
  const visKm =
    visibility !== null ? Math.round(visibility / 1000) : null;

  return (
    <div className="md:col-span-2 relative rounded-2xl overflow-hidden h-64 group">
      {/* Background gradient simulating a marine photo */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-container via-primary/60 to-primary" />
      {/* Decorative wave SVG as texture */}
      <div className="absolute inset-0 opacity-20">
        <svg
          className="w-full h-full"
          preserveAspectRatio="none"
          viewBox="0 0 1000 400"
          aria-hidden="true"
        >
          <path
            d="M0,200 C200,80 400,320 600,200 C800,80 900,200 1000,150 V400 H0 Z"
            fill="white"
          />
        </svg>
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/20 to-transparent" />

      {isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" role="status" aria-label="Cargando datos marinos" />
        </div>
      ) : hasData ? (
        <div className="absolute bottom-0 left-0 p-8 w-full">
          {/* Top row: wave info */}
          {(waveHeight !== null || wavePeriod !== null) && (
            <div className="mb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-secondary-container">
                Oleaje
              </span>
            <div className="flex items-center gap-4 mt-1">
              {waveHeight !== null && (
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-secondary-container text-lg">
                    tsunami
                  </span>
                  <span className="text-sm font-semibold text-white/90">
                    {waveHeight.toFixed(1)} m
                  </span>
                </div>
              )}
              {wavePeriod !== null && wavePeriod > 0 && (
                <div className="text-sm text-white/70">
                  T: {wavePeriod.toFixed(0)}s
                </div>
              )}
            </div>
            </div>
          )}

          {/* Bottom row: visibility + sea temp */}
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-secondary-container">
                Visibilidad
              </span>
              <div className="text-3xl font-headline font-bold text-white">
                {visLabel ? (
                  <>
                    {visLabel}{" "}
                    {visKm !== null && (
                      <span className="text-lg text-white/70">
                        &middot; {visKm >= 10 ? "10+" : visKm} km
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-lg text-white/50">—</span>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-widest text-secondary-container">
                Temp. agua
              </span>
              <div className="text-3xl font-headline font-bold text-white">
                {seaTemp !== null ? (
                  <>{seaTemp.toFixed(1)} °C</>
                ) : (
                  <span className="text-lg text-white/50">—</span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm text-white/60">
            Sin datos marinos
          </span>
        </div>
      )}
    </div>
  );
}
