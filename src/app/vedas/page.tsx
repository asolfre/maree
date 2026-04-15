"use client";

import { useState, useEffect, useCallback } from "react";
import type { ClosuresResponse } from "@/lib/species/types";
import { getClosuresForYear } from "@/lib/species/closures";
import ClosureList from "@/components/ClosureList";
import ClosureTimeline from "@/components/ClosureTimeline";

function VedasContent() {
  const [data, setData] = useState<ClosuresResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  const yearClosures = getClosuresForYear(currentYear);

  const fetchClosures = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/closures");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: ClosuresResponse = await res.json();
      setData(json);
    } catch {
      setError("No se pudieron obtener los datos de vedas");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClosures();
  }, [fetchClosures]);

  const closedCount =
    data?.closures.filter((c) => c.status === "closed").length ?? 0;
  const closingSoonCount =
    data?.closures.filter((c) => c.status === "closing_soon").length ?? 0;

  return (
    <div className="max-w-7xl mx-auto px-6 pt-12 pb-32">
      {/* Hero Header Section */}
      <section className="mb-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-error font-bold tracking-widest uppercase text-xs">
              <span className="w-8 h-[2px] bg-error" />
              Paro Biológico
            </div>
            <h1 className="font-headline font-extrabold text-6xl md:text-8xl tracking-tighter text-primary leading-none">
              Vedas y<br />Paros.
            </h1>
          </div>

          {/* Summary card */}
          {!isLoading && data && (
            <div className="bg-surface-container-low p-8 rounded-xl max-w-sm w-full">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">
                    Vedas activas
                  </p>
                  <p className="font-headline text-4xl font-extrabold text-error">
                    {closedCount}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">
                    Próximamente
                  </p>
                  <p className="font-headline text-4xl font-extrabold text-tertiary">
                    {closingSoonCount}
                  </p>
                </div>
              </div>
              <p className="text-xs text-on-surface-variant mt-4">
                Costa Gallega — {currentYear}
              </p>
            </div>
          )}
        </div>
      </section>

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
            onClick={fetchClosures}
            className="text-xs text-primary font-semibold"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Main content */}
      {!isLoading && !error && data && (
        <>
          {/* Annual Timeline */}
          <section className="mb-16">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="font-headline text-3xl font-extrabold text-primary">
                  Calendario {currentYear}
                </h2>
                <p className="text-sm text-on-surface-variant mt-1">
                  Períodos de veda por especie
                </p>
              </div>
            </div>
            <div className="bg-surface-container-lowest rounded-2xl p-6 overflow-hidden">
              <ClosureTimeline closures={yearClosures} year={currentYear} />
            </div>
          </section>

          {/* Species List */}
          <section className="mb-16">
            <div className="mb-6">
              <h2 className="font-headline text-3xl font-extrabold text-primary">
                Estado por especie
              </h2>
              <p className="text-sm text-on-surface-variant mt-1">
                Situación actual de todas las especies reguladas
              </p>
            </div>
            <ClosureList closureInfo={data.closures} />
          </section>

          {/* DOG Feed */}
          {data.dogFeedEntries.length > 0 && (
            <section className="mb-16">
              <div className="mb-6">
                <h2 className="font-headline text-3xl font-extrabold text-primary">
                  Diario Oficial de Galicia
                </h2>
                <p className="text-sm text-on-surface-variant mt-1">
                  Últimas disposiciones sobre pesca y marisqueo
                </p>
              </div>
              <div className="space-y-3">
                {data.dogFeedEntries.map((entry, i) => (
                  <a
                    key={i}
                    href={entry.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-surface-container-lowest rounded-2xl p-5 hover:shadow-md transition-all duration-300 group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-xl bg-primary-container flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-lg text-on-primary-container">
                          article
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors line-clamp-2">
                          {entry.title}
                        </h4>
                        {entry.date && (
                          <p className="text-xs text-on-surface-variant mt-1">
                            {new Date(entry.date).toLocaleDateString("es-ES", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </p>
                        )}
                      </div>
                      <span className="material-symbols-outlined text-sm text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1">
                        open_in_new
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Disclaimer */}
          <section className="bg-surface-container-low rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-on-surface-variant text-lg shrink-0 mt-0.5">
                info
              </span>
              <div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  <strong>Nota:</strong> Los períodos de veda mostrados son
                  orientativos y se basan en los calendarios típicos de la
                  Consellería do Mar. Las fechas exactas pueden variar cada año
                  según las resoluciones publicadas en el{" "}
                  <a
                    href="https://www.xunta.gal/diario-oficial-galicia"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary font-semibold hover:underline"
                  >
                    Diario Oficial de Galicia (DOG)
                  </a>
                  . Consulte siempre la normativa oficial vigente antes de
                  realizar actividades extractivas.
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default function VedasPage() {
  return <VedasContent />;
}
