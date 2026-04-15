"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { STATIONS } from "@/lib/stations";
import { useFavorites } from "@/lib/useFavorites";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const { favorites, isFavorite, toggleFavorite } = useFavorites();
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = window.localStorage.getItem("maree_recent_searches");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const filteredStations = useMemo(() => {
    let stations = STATIONS;
    if (favoritesOnly && favorites.length > 0) {
      stations = stations.filter((s) => isFavorite(s.id));
    }
    if (!query.trim()) return stations;
    const q = query.toLowerCase();
    return stations.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.shortName.toLowerCase().includes(q) ||
        s.id.includes(q)
    );
  }, [query, favoritesOnly, favorites, isFavorite]);

  const handleStationClick = (stationId: string) => {
    try {
      const updated = [
        stationId,
        ...recentSearches.filter((s) => s !== stationId),
      ].slice(0, 5);
      window.localStorage.setItem("maree_recent_searches", JSON.stringify(updated));
    } catch {
      // localStorage unavailable
    }
  };

  const handleRemoveRecent = (stationId: string) => {
    const updated = recentSearches.filter((s) => s !== stationId);
    setRecentSearches(updated);
    try {
      window.localStorage.setItem("maree_recent_searches", JSON.stringify(updated));
    } catch {
      // localStorage unavailable
    }
  };

  // Pick featured stations for the bento suggestions
  const featuredStations = STATIONS.slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto px-6 pt-8 pb-8">
      {/* Hero Search Section */}
      <section className="mb-12">
        <div className="relative w-full max-w-2xl mx-auto">
          <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-outline">
              search
            </span>
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar playas, puertos o estaciones..."
            className="w-full pl-14 pr-16 py-5 bg-surface-container-highest border-none rounded-xl text-lg font-medium focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-outline"
            autoFocus
          />
          <div className="absolute inset-y-0 right-4 flex items-center gap-2">
            {query && (
              <button
                onClick={() => setQuery("")}
                className="p-2 text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-lg">
                  close
                </span>
              </button>
            )}
            <button
              onClick={() => setFavoritesOnly((v) => !v)}
              className={`p-2 rounded-lg shadow-lg transition-all active:scale-95 ${
                favoritesOnly
                  ? "bg-tertiary text-white"
                  : "bg-primary text-white hover:opacity-90"
              }`}
              title={favoritesOnly ? "Mostrar todas" : "Solo favoritos"}
            >
              <span className="material-symbols-outlined">
                {favoritesOnly ? "star" : "filter_list"}
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Bento Grid: Nearby Suggestions (only show when not searching) */}
      {!query && (
        <section className="mb-16">
          <div className="flex items-end justify-between mb-8">
            <div>
              <span className="text-secondary font-bold tracking-widest uppercase text-xs mb-2 block">
                Explorar
              </span>
              <h2 className="font-headline text-4xl font-extrabold text-primary tracking-tight">
                Sugerencias cercanas
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Large Featured Suggestion */}
            <div className="md:col-span-2 group relative overflow-hidden rounded-xl h-[400px] shadow-sm hover:shadow-xl transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-container via-primary/40 to-primary" />
              <div className="absolute inset-0 opacity-20">
                <svg
                  className="w-full h-full"
                  preserveAspectRatio="none"
                  viewBox="0 0 1000 400"
                >
                  <path
                    d="M0,200 C200,80 400,320 600,200 C800,80 900,200 1000,150 V400 H0 Z"
                    fill="white"
                  />
                </svg>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 p-8 w-full flex justify-between items-end">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="material-symbols-outlined text-sm"
                      style={{
                        color: "#ffe082",
                        fontVariationSettings: "'FILL' 1",
                      }}
                    >
                      location_on
                    </span>
                    <span className="text-surface-container-lowest font-label text-xs tracking-widest uppercase">
                      {featuredStations[0].name}
                    </span>
                  </div>
                  <Link
                    href={`/?station=${featuredStations[0].id}`}
                    onClick={() => handleStationClick(featuredStations[0].id)}
                    className="block"
                  >
                    <h3 className="font-headline text-3xl font-bold text-white mb-2">
                      {featuredStations[0].shortName}
                    </h3>
                  </Link>
                  <p className="text-white/80 text-sm max-w-sm">
                    Mareas suaves y aguas ideales para la exploración costera.
                  </p>
                </div>
                <div className="bg-surface-container-lowest/20 backdrop-blur-md rounded-full p-4 border border-white/20">
                  <span className="material-symbols-outlined text-white text-3xl">
                    waves
                  </span>
                </div>
              </div>
            </div>

            {/* Secondary Suggestions */}
            <div className="flex flex-col gap-6">
              <Link
                href={`/?station=${featuredStations[1].id}`}
                onClick={() => handleStationClick(featuredStations[1].id)}
                className="group relative overflow-hidden rounded-xl h-[188px] shadow-sm bg-surface-container-low border border-outline-variant/10 hover:shadow-lg transition-all duration-300"
              >
                <div className="p-6">
                  <span className="inline-block px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-[10px] font-bold uppercase tracking-tighter mb-4">
                    Estación activa
                  </span>
                  <h4 className="font-headline text-xl font-bold text-primary mb-1">
                    {featuredStations[1].name}
                  </h4>
                  <p className="text-on-surface-variant text-xs font-medium">
                    {featuredStations[1].lat.toFixed(2)}°N,{" "}
                    {Math.abs(featuredStations[1].lon).toFixed(2)}°W
                  </p>
                </div>
                <div className="absolute bottom-4 right-4 text-primary/10">
                  <span className="material-symbols-outlined text-6xl">
                    anchor
                  </span>
                </div>
              </Link>
              <Link
                href={`/?station=${featuredStations[2].id}`}
                onClick={() => handleStationClick(featuredStations[2].id)}
                className="group relative overflow-hidden rounded-xl h-[188px] shadow-sm bg-primary text-white hover:shadow-lg transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-primary-container opacity-50" />
                <div className="relative z-10 p-6 flex flex-col h-full justify-between">
                  <h4 className="font-headline text-xl font-bold">
                    {featuredStations[2].name}
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="font-headline text-2xl font-bold">
                      {featuredStations[2].lat.toFixed(2)}°N
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-white/60">
                      Costa gallega
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Favorites Section */}
      {!query && favorites.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center gap-4 mb-8">
            <div className="flex items-center gap-2">
              <span
                className="material-symbols-outlined text-tertiary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                star
              </span>
              <h2 className="font-headline text-2xl font-bold text-primary">
                Favoritos
              </h2>
            </div>
            <div className="h-[1px] flex-grow bg-surface-container-high" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {favorites.map((id) => {
              const favStation = STATIONS.find((s) => s.id === id);
              if (!favStation) return null;
              return (
                <div
                  key={id}
                  className="bg-tertiary-container/30 backdrop-blur-md p-5 rounded-xl border border-tertiary/20 hover:border-tertiary transition-colors group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-lg bg-tertiary-container flex items-center justify-center text-on-tertiary-container">
                      <span className="material-symbols-outlined">waves</span>
                    </div>
                    <button
                      onClick={() => toggleFavorite(id)}
                      className="text-tertiary hover:text-error transition-colors"
                      aria-label="Quitar de favoritos"
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{
                          fontSize: "20px",
                          fontVariationSettings: "'FILL' 1",
                        }}
                      >
                        star
                      </span>
                    </button>
                  </div>
                  <Link
                    href={`/?station=${id}`}
                    onClick={() => handleStationClick(id)}
                  >
                    <h5 className="font-bold text-primary mb-1">
                      {favStation.name}
                    </h5>
                  </Link>
                  <p className="text-xs text-on-surface-variant">
                    {favStation.lat.toFixed(2)}°N,{" "}
                    {Math.abs(favStation.lon).toFixed(2)}°W
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Recent Searches Section */}
      {!query && recentSearches.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="font-headline text-2xl font-bold text-primary">
               Búsquedas recientes
            </h2>
            <div className="h-[1px] flex-grow bg-surface-container-high" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentSearches.map((id) => {
              const station = STATIONS.find((s) => s.id === id);
              if (!station) return null;
              return (
                <div
                  key={id}
                  className="bg-surface/70 backdrop-blur-md p-5 rounded-xl border border-outline-variant/20 hover:border-secondary transition-colors cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined">
                        history
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveRecent(id);
                      }}
                      className="text-outline group-hover:text-error transition-colors"
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: "18px" }}
                      >
                        close
                      </span>
                    </button>
                  </div>
                  <Link href={`/?station=${id}`}>
                    <h5 className="font-bold text-primary mb-1">
                      {station.name}
                    </h5>
                  </Link>
                  <p className="text-xs text-on-surface-variant">
                    {station.shortName}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Station list (when searching) */}
      {query && (
        <section>
          <div className="flex items-center gap-4 mb-6">
            <h2 className="font-headline text-lg font-bold text-primary">
              {filteredStations.length} resultados
            </h2>
            <div className="h-[1px] flex-grow bg-surface-container-high" />
          </div>

          <div className="space-y-3">
            {filteredStations.map((station) => (
              <div
                key={station.id}
                className="flex items-center gap-4 p-4 bg-surface-container-lowest rounded-xl shadow-[0_2px_8px_rgba(0,42,72,0.03)] hover:shadow-[0_8px_24px_rgba(0,42,72,0.06)] transition-all duration-300"
              >
                <Link
                  href={`/?station=${station.id}`}
                  onClick={() => handleStationClick(station.id)}
                  className="flex items-center gap-4 flex-1"
                >
                  <div className="w-12 h-12 bg-primary-container rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-on-primary-container text-xl">
                      location_on
                    </span>
                  </div>

                  <div className="flex-1">
                    <p className="font-headline text-base font-bold text-on-surface">
                      {station.name}
                    </p>
                    <p className="text-xs font-body text-on-surface-variant mt-0.5">
                      {station.lat.toFixed(2)}°N,{" "}
                      {Math.abs(station.lon).toFixed(2)}°W
                      {station.mohidModel ? " · MOHID" : " · ROMS"}
                    </p>
                  </div>

                  <span className="material-symbols-outlined text-on-surface-variant">
                    chevron_right
                  </span>
                </Link>

                <button
                  onClick={() => toggleFavorite(station.id)}
                  className="p-2 rounded-full hover:bg-surface-container transition-colors"
                  aria-label={
                    isFavorite(station.id)
                      ? "Quitar de favoritos"
                      : "Agregar a favoritos"
                  }
                >
                  <span
                    className="material-symbols-outlined text-tertiary"
                    style={{
                      fontVariationSettings: isFavorite(station.id)
                        ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24"
                        : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
                    }}
                  >
                    star
                  </span>
                </button>
              </div>
            ))}

            {filteredStations.length === 0 && (
              <div className="text-center py-16 text-on-surface-variant">
                <span className="material-symbols-outlined text-4xl mb-3 block">
                  search_off
                </span>
                <p className="text-sm">
                  No se encontraron estaciones para &quot;{query}&quot;
                </p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
