"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadOfflineSnapshot, type OfflineSnapshot } from "@/lib/offlineCache";

/** Format a relative "time ago" string from an ISO timestamp. */
function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "hace un momento";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

export default function OfflinePage() {
  const [snapshot, setSnapshot] = useState<OfflineSnapshot | null>(null);

  useEffect(() => {
    setSnapshot(loadOfflineSnapshot());
  }, []);

  return (
    <div className="max-w-md mx-auto px-6 pt-24 pb-8 text-center">
      <div className="mb-8">
        <span className="material-symbols-outlined text-6xl text-on-surface-variant mb-4 block">
          cloud_off
        </span>
        <h1 className="font-headline text-3xl font-extrabold text-primary mb-3">
          Sin conexión
        </h1>
        <p className="text-on-surface-variant text-sm leading-relaxed">
          No se puede acceder a los datos de mareas en este momento. Comprueba
          tu conexión a internet e inténtalo de nuevo.
        </p>
      </div>

      {/* Cached snapshot card */}
      {snapshot ? (
        <div className="bg-surface-container-low rounded-2xl p-6 mb-8 text-left">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-headline text-lg font-bold text-primary">
              Último dato guardado
            </h2>
            <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-widest">
              {timeAgo(snapshot.savedAt)}
            </span>
          </div>

          <div className="mb-3">
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
               Estación
            </span>
            <p className="text-base font-extrabold text-on-surface font-headline">
              {snapshot.stationName}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Tide height */}
            <div className="bg-surface-container rounded-xl p-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-1">
                Altura
              </span>
              <span className="text-sm font-extrabold text-primary font-headline">
                {snapshot.currentHeight != null
                  ? `${snapshot.currentHeight.toFixed(2)}m`
                  : "—"}
              </span>
              {snapshot.direction && (
                <div className="flex items-center gap-1 mt-1">
                  <span className="material-symbols-outlined text-[14px] text-secondary">
                    {snapshot.direction === "rising"
                      ? "arrow_upward"
                      : "arrow_downward"}
                  </span>
                  <span className="text-[10px] text-on-surface-variant">
                    {snapshot.direction === "rising" ? "Subiendo" : "Bajando"}
                  </span>
                </div>
              )}
            </div>

            {/* Wind */}
            <div className="bg-surface-container rounded-xl p-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-1">
                Viento
              </span>
              <span className="text-sm font-extrabold text-primary font-headline">
                {snapshot.windSpeed != null
                  ? `${Math.round(snapshot.windSpeed)} km/h`
                  : "—"}
              </span>
            </div>

            {/* SST */}
            <div className="bg-surface-container rounded-xl p-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-1">
                Temp. mar
              </span>
              <span className="text-sm font-extrabold text-primary font-headline">
                {snapshot.seaTemp != null
                  ? `${snapshot.seaTemp.toFixed(1)}°C`
                  : "—"}
              </span>
            </div>
          </div>

          <p className="text-[10px] text-on-surface-variant mt-3 text-center">
            Datos de {new Date(snapshot.savedAt).toLocaleString("es-ES", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      ) : (
        <div className="bg-surface-container-low rounded-2xl p-6 mb-8">
          <h2 className="font-headline text-lg font-bold text-primary mb-3">
            Datos almacenados
          </h2>
          <p className="text-xs text-on-surface-variant">
            No hay datos guardados. Visita la página principal con conexión para
            almacenar datos que se mostrarán aquí cuando estés sin conexión.
          </p>
        </div>
      )}

      <Link
        href="/"
        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-on-primary rounded-full font-bold text-sm uppercase tracking-wider shadow-lg hover:opacity-90 active:scale-95 transition-all"
      >
        <span className="material-symbols-outlined text-lg">home</span>
        Ir al inicio
      </Link>
    </div>
  );
}
