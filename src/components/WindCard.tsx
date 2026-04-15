"use client";

/**
 * Wind card for the bento grid.
 * Editorial design: tall h-64 card with hover shadow transition.
 * Displays live wind data from Open-Meteo.
 */

import { windDirectionLabel } from "@/lib/openmeteo";

interface WindCardProps {
  windSpeed: number | null;
  windDirection: number | null;
  windGusts: number | null;
  isLoading?: boolean;
}

export default function WindCard({
  windSpeed,
  windDirection,
  windGusts,
  isLoading,
}: WindCardProps) {
  const hasData = windSpeed !== null && windDirection !== null;

  return (
    <div className="bg-surface-container-lowest p-8 rounded-2xl flex flex-col justify-between h-64 group hover:shadow-xl transition-all duration-500">
      <div className="flex justify-between items-start">
        <span className="material-symbols-outlined text-secondary text-3xl">
          air
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
          Viento
        </span>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" role="status" aria-label="Cargando datos de viento" />
        </div>
      ) : hasData ? (
        <div>
          <div className="text-4xl font-headline font-extrabold text-primary">
            {Math.round(windSpeed!)}{" "}
            <span className="text-lg font-bold text-outline">
              KTS
            </span>
          </div>
          {windGusts !== null && windGusts > windSpeed! + 5 && (
            <div className="text-xs text-on-surface-variant mt-0.5">
              Rachas {Math.round(windGusts)} kts
            </div>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span
              className="material-symbols-outlined text-sm text-secondary"
              style={{ transform: `rotate(${windDirection!}deg)` }}
              aria-hidden="true"
            >
              navigation
            </span>
            <span className="text-sm font-medium text-on-surface-variant">
              {windDirectionLabel(windDirection!)}
            </span>
          </div>
        </div>
      ) : (
        <div className="text-sm text-on-surface-variant">
          Sin datos de viento
        </div>
      )}
    </div>
  );
}
