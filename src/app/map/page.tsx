"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { STATIONS } from "@/lib/stations";
import { useFavorites } from "@/lib/useFavorites";
import type { Station } from "@/lib/tides/types";

// Leaflet must be loaded client-side only (no SSR)
const StationMap = dynamic(() => import("@/components/StationMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-surface-container-low flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  ),
});

export default function MapPage() {
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [tideHeights, setTideHeights] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [showListView, setShowListView] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const { favorites, isFavorite } = useFavorites();
  const searchRef = useRef<HTMLDivElement>(null);

  // Stations visible on map — filtered by favorites if active
  const visibleStations = useMemo(() => {
    if (!favoritesOnly || favorites.length === 0) return STATIONS;
    return STATIONS.filter((s) => isFavorite(s.id));
  }, [favoritesOnly, favorites, isFavorite]);

  // Filter stations by search query (name, shortName, id)
  const filteredStations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return STATIONS.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.shortName.toLowerCase().includes(q) ||
        s.id.includes(q)
    );
  }, [searchQuery]);

  // Show results dropdown when there's a query with matches
  useEffect(() => {
    setShowResults(filteredStations.length > 0 && searchQuery.trim().length > 0);
  }, [filteredStations, searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle station selection from search results
  function handleSearchSelect(station: Station) {
    setSelectedStation(station);
    setSearchQuery("");
    setShowResults(false);
  }

  // Handle station selection from list view
  const handleListSelect = useCallback((station: Station) => {
    setSelectedStation(station);
    setShowListView(false);
  }, []);

  // Fetch current tide heights for all stations via batch endpoint
  useEffect(() => {
    async function fetchAllHeights() {
      try {
        const res = await fetch("/api/tides/heights");
        if (!res.ok) return;
        const data = await res.json();
        if (data.heights) {
          // Filter out nulls and convert to Record<string, number>
          const valid: Record<string, number> = {};
          for (const [id, height] of Object.entries(data.heights)) {
            if (height != null) {
              valid[id] = height as number;
            }
          }
          setTideHeights(valid);
        }
      } catch {
        // Non-fatal — pins will show wave icon instead of height
      }
    }

    fetchAllHeights();

    // Refresh every 15 minutes
    const interval = setInterval(fetchAllHeights, 15 * 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative" style={{ height: "calc(100dvh - 144px)" }}>
      {/* Full-screen map */}
      <StationMap
        stations={visibleStations}
        selectedStation={selectedStation ?? undefined}
        onStationSelect={setSelectedStation}
        height="100%"
        tideHeights={tideHeights}
      />

      {/* Floating UI: Search & Station Info */}
      <div className="absolute top-6 left-6 right-20 md:right-auto md:w-96 flex flex-col gap-4 z-[1000]">
        {/* Search bar with dropdown */}
        <div ref={searchRef} className="relative">
          <div className="bg-surface-container-lowest/80 backdrop-blur-md rounded-2xl shadow-lg p-2 flex items-center gap-2">
            <div className="flex-1 flex items-center px-4 gap-3 bg-surface-container-low rounded-xl py-3">
              <span className="material-symbols-outlined text-on-surface-variant">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (filteredStations.length > 0) setShowResults(true);
                }}
                className="bg-transparent border-none p-0 text-sm font-medium text-on-surface focus:outline-none focus:ring-0 w-full placeholder:text-on-surface-variant"
                placeholder="Buscar estación..."
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setShowResults(false);
                  }}
                  className="text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    close
                  </span>
                </button>
              )}
            </div>
            <button
              onClick={() => setFavoritesOnly((v) => !v)}
              className={`w-12 h-12 flex items-center justify-center rounded-xl transition-colors ${
                favoritesOnly
                  ? "bg-primary text-on-primary"
                  : "text-primary bg-surface-container-low hover:bg-surface-container-high"
              }`}
              title={favoritesOnly ? "Mostrar todas" : "Solo favoritos"}
            >
              <span className="material-symbols-outlined">
                {favoritesOnly ? "star" : "tune"}
              </span>
            </button>
          </div>

          {/* Search results dropdown */}
          {showResults && (
            <div className="mt-2 bg-surface-container-lowest/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-outline-variant/20 overflow-hidden">
              {filteredStations.map((station) => (
                <button
                  key={station.id}
                  onClick={() => handleSearchSelect(station)}
                  className="w-full px-5 py-3.5 flex items-center gap-4 hover:bg-surface-container-low transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-secondary text-[20px]">
                    location_on
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-on-surface truncate">
                      {station.name}
                    </div>
                    <div className="text-xs text-on-surface-variant">
                      {station.lat.toFixed(2)}°N, {Math.abs(station.lon).toFixed(2)}°W
                      {tideHeights[station.id] != null && (
                        <span className="ml-2 font-semibold text-primary">
                          {tideHeights[station.id].toFixed(2)}m
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
                    chevron_right
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Station Quick Info Card */}
        {selectedStation && (
          <div className="bg-surface/90 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border border-outline-variant/20">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-headline text-lg font-extrabold text-primary leading-tight">
                  {selectedStation.name}
                </h3>
                <p className="text-xs font-semibold text-secondary flex items-center gap-1 mt-1">
                  <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                  ESTACIÓN ACTIVA
                </p>
              </div>
              <button
                onClick={() => setSelectedStation(null)}
                className="text-on-surface-variant hover:text-primary"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-surface-container-low rounded-xl p-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-1">
                  Altura actual
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-extrabold text-primary font-headline">
                    {tideHeights[selectedStation.id] != null
                      ? `${tideHeights[selectedStation.id].toFixed(2)}m`
                      : "—"}
                  </span>
                </div>
              </div>
              <div className="bg-surface-container-low rounded-xl p-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-1">
                  Modelo
                </span>
                <div className="text-sm font-extrabold text-primary font-headline">
                  {selectedStation.mohidModel
                    ? "MOHID"
                    : "ROMS"}
                </div>
              </div>
            </div>
            <a
              href={`/?station=${selectedStation.id}`}
              className="w-full mt-6 bg-gradient-to-br from-primary to-primary-container text-on-primary py-4 rounded-full font-headline font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-all"
            >
               Ver previsión completa
              <span className="material-symbols-outlined text-[18px]">
                arrow_forward
              </span>
            </a>
          </div>
        )}
      </div>

      {/* List View Toggle (Bottom Sheet Style Trigger) */}
      {!showListView && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[1000]">
          <button
            onClick={() => setShowListView(true)}
            className="bg-surface-container-lowest px-8 py-4 rounded-full shadow-2xl flex items-center gap-3 border border-outline-variant/20 hover:bg-surface-container transition-colors active:scale-95 group"
          >
            <span className="material-symbols-outlined text-primary group-hover:rotate-12 transition-transform">
              format_list_bulleted
            </span>
            <span className="font-headline font-bold text-sm tracking-tight text-primary">
              Ver lista
            </span>
          </button>
        </div>
      )}

      {/* Station List Overlay (Bottom Sheet) */}
      {showListView && (
        <div className="absolute inset-x-0 bottom-0 z-[1000] flex flex-col max-h-[60%] animate-slide-up">
          {/* Handle + Header */}
          <div className="bg-surface-container-lowest rounded-t-3xl shadow-2xl border-t border-outline-variant/20">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-outline-variant/40" />
            </div>
            <div className="flex items-center justify-between px-6 pb-4">
              <h3 className="font-headline font-extrabold text-lg text-primary">
                Estaciones
              </h3>
              <button
                onClick={() => setShowListView(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors text-on-surface-variant"
              >
                <span className="material-symbols-outlined text-[20px]">
                  close
                </span>
              </button>
            </div>
          </div>

          {/* Scrollable Station List */}
          <div className="bg-surface-container-lowest overflow-y-auto overscroll-contain divide-y divide-outline-variant/10">
            {STATIONS.map((station) => {
              const height = tideHeights[station.id];
              const isSelected = selectedStation?.id === station.id;
              return (
                <button
                  key={station.id}
                  onClick={() => handleListSelect(station)}
                  className={`w-full px-6 py-4 flex items-center gap-4 text-left transition-colors ${
                    isSelected
                      ? "bg-primary-container/30"
                      : "hover:bg-surface-container-low"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      isSelected
                        ? "bg-primary text-on-primary"
                        : "bg-surface-container text-primary"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      location_on
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-on-surface truncate">
                      {station.name}
                    </div>
                    <div className="text-xs text-on-surface-variant">
                      {station.lat.toFixed(2)}°N,{" "}
                      {Math.abs(station.lon).toFixed(2)}°W
                      {station.mohidModel ? " · MOHID" : " · ROMS"}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {height != null ? (
                      <span className="text-sm font-extrabold text-primary font-headline">
                        {height.toFixed(2)}m
                      </span>
                    ) : (
                      <span className="text-xs text-on-surface-variant">—</span>
                    )}
                    <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
                      chevron_right
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
