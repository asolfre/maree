"use client";

import type { TideState } from "@/lib/tides/types";

interface HeroSectionProps {
  stationName: string;
  state: TideState | null;
  isLive: boolean;
  /** Whether this station is a favorite */
  isFavorite?: boolean;
  /** Toggle favorite callback */
  onToggleFavorite?: () => void;
}

export default function HeroSection({
  stationName,
  state,
  isLive,
  isFavorite = false,
  onToggleFavorite,
}: HeroSectionProps) {
  const height = state?.currentHeight ?? 0;
  const direction = state?.direction ?? "rising";
  const directionLabel = direction === "rising" ? "subiendo" : "bajando";

  return (
    <section className="space-y-2">
      {/* Live indicator */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 text-secondary font-bold tracking-widest uppercase text-[10px]">
          <span
            className={`w-2 h-2 rounded-full ${
              isLive ? "bg-secondary animate-pulse" : "bg-outline"
            }`}
          />
          {isLive ? "Datos en vivo" : "Sin conexión"} &middot; {stationName}
        </div>
        {onToggleFavorite && (
          <button
            onClick={onToggleFavorite}
            className="p-1 rounded-full hover:bg-surface-container transition-colors"
            aria-label={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
          >
            <span
              className="material-symbols-outlined text-lg text-tertiary"
              style={{
                fontVariationSettings: isFavorite
                  ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24"
                  : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
              }}
            >
              star
            </span>
          </button>
        )}
      </div>

      {/* Current tide height - editorial typography */}
      <h2 className="font-headline font-extrabold text-7xl md:text-8xl tracking-tighter text-primary leading-none">
        {height.toFixed(1)}
        <span className="text-3xl font-bold align-top ml-1 text-on-surface-variant">
          M
        </span>
      </h2>

      {/* Tide state description */}
      <p className="text-lg text-on-surface-variant font-medium max-w-md">
        La marea está actualmente{" "}
        <span className="text-primary font-bold">{directionLabel}</span>.
        {direction === "rising"
          ? " Condiciones óptimas para la exploración costera."
          : " Nivel descendente hacia la bajamar."}
      </p>

      {/* Progress bar */}
      {state && (
        <div className="pt-2">
          <div className="flex justify-between text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5">
            <span>{direction === "rising" ? "Bajamar" : "Pleamar"}</span>
            <span>{direction === "rising" ? "Pleamar" : "Bajamar"}</span>
          </div>
          <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden">
            <div
              className="h-full bg-secondary rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${state.cycleProgress}%` }}
              role="progressbar"
              aria-valuenow={state.cycleProgress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Progreso del ciclo de marea: ${state.cycleProgress}%`}
            />
          </div>
        </div>
      )}
    </section>
  );
}
