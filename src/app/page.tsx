"use client";

import { Suspense, useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import type {
  TidePoint,
  TideExtreme,
  TideState,
  CombinedTideResponse,
} from "@/lib/tides/types";
import type { WeatherData, MarineData } from "@/lib/openmeteo";
import type { SpeciesClosureInfo } from "@/lib/species/types";
import { STATIONS } from "@/lib/stations";
import { computeTideAlert } from "@/lib/tides/alerts";
import { useFavorites } from "@/lib/useFavorites";
import { saveOfflineSnapshot } from "@/lib/offlineCache";
import HeroSection from "@/components/HeroSection";
import TideMetricCard from "@/components/TideMetricCard";
import TideCurve from "@/components/TideCurve";
import WindCard from "@/components/WindCard";
import MarineCard from "@/components/MarineCard";
import CelestialCard from "@/components/CelestialCard";
import MapCard from "@/components/MapCard";
import SpeciesClosureCard from "@/components/SpeciesClosureCard";

type TideView = "today" | "7day";

/** Resolve initial station from URL ?station= param, falling back to "vigo" */
function useInitialStation(): string {
  const searchParams = useSearchParams();
  const urlStation = searchParams.get("station");
  // Validate that the URL param matches a known station
  if (urlStation && STATIONS.some((s) => s.id === urlStation)) {
    return urlStation;
  }
  return "vigo";
}

function HomeContent() {
  const initialStation = useInitialStation();
  const [stationId, setStationId] = useState(initialStation);

  // Sync stationId when URL ?station= param changes (client-side navigation)
  useEffect(() => {
    setStationId(initialStation);
  }, [initialStation]);
  const [points, setPoints] = useState<TidePoint[]>([]);
  const [obsPoints, setObsPoints] = useState<TidePoint[]>([]);
  const [fcstPoints, setFcstPoints] = useState<TidePoint[]>([]);
  const [extremes, setExtremes] = useState<TideExtreme[]>([]);
  const [state, setState] = useState<TideState | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<TideView>("today");
  const [currentTime, setCurrentTime] = useState(new Date());

  // Weather & marine data
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [marine, setMarine] = useState<MarineData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  // Closure data
  const [closureInfo, setClosureInfo] = useState<SpeciesClosureInfo[]>([]);
  const [closureLoading, setClosureLoading] = useState(true);

  const station = STATIONS.find((s) => s.id === stationId) ?? STATIONS[0];
  const { isFavorite, toggleFavorite } = useFavorites();

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Detect nearest station via geolocation — only when no station was
  // explicitly chosen via URL param (i.e. user navigated directly to "/")
  useEffect(() => {
    if (initialStation !== "vigo") return; // URL param was set, skip geo
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `/api/stations/nearest?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`
          );
          if (res.ok) {
            const data = await res.json();
            if (data.nearest?.id) {
              setStationId(data.nearest.id);
            }
          }
        } catch {
          // Silently fall back to default station
        }
      },
      () => {
        // Geolocation denied, use default
      },
      { timeout: 5000, maximumAge: 300_000 }
    );
  }, [initialStation]);

  // Fetch combined tide data (observations + forecast merged)
  const fetchTideData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch(
        `/api/tides/combined?station=${stationId}&date=${today}`
      );

      if (!res.ok) {
        setError("No se pudieron obtener datos de mareas");
        setIsLive(false);
        return;
      }

      const data: CombinedTideResponse = await res.json();

      setPoints(data.points);
      setObsPoints(data.obsPoints);
      setFcstPoints(data.fcstPoints);
      setExtremes(data.extremes);
      setState(data.state);
      setIsLive(data.isLive);
    } catch {
      setError("Error de conexión");
      setIsLive(false);
    } finally {
      setIsLoading(false);
    }
  }, [stationId]);

  // Fetch weather & marine data from Open-Meteo
  const fetchWeatherData = useCallback(async () => {
    setWeatherLoading(true);
    try {
      const res = await fetch(`/api/weather?station=${stationId}`);
      if (res.ok) {
        const data = await res.json();
        setWeather(data.weather);
        setMarine(data.marine);
      }
    } catch {
      // Non-fatal: cards will show "—" placeholders
    } finally {
      setWeatherLoading(false);
    }
  }, [stationId]);

  // Fetch closure data
  const fetchClosureData = useCallback(async () => {
    setClosureLoading(true);
    try {
      const res = await fetch("/api/closures");
      if (res.ok) {
        const data = await res.json();
        setClosureInfo(data.closures);
      }
    } catch {
      // Non-fatal: card will show loading state
    } finally {
      setClosureLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTideData();
    fetchWeatherData();
    fetchClosureData();
    // Refresh every 15 minutes
    const interval = setInterval(() => {
      fetchTideData();
      fetchWeatherData();
    }, 15 * 60_000);
    return () => clearInterval(interval);
  }, [fetchTideData, fetchWeatherData, fetchClosureData]);

  // Persist snapshot for offline fallback page
  useEffect(() => {
    if (!state) return; // No data yet
    saveOfflineSnapshot({
      stationName: station.name,
      stationId: station.id,
      currentHeight: state.currentHeight ?? null,
      direction: state.direction ?? null,
      savedAt: new Date().toISOString(),
      windSpeed: weather?.windSpeed ?? null,
      seaTemp: marine?.seaTemp ?? null,
      activeClosureCount: closureInfo.filter((c) => c.status === "closed").length,
    });
  }, [state, weather, marine, station, closureInfo]);

  // Data-driven tide alert based on lunar phase + tidal range
  const tideAlert = useMemo(
    () => computeTideAlert(extremes, new Date()),
    [extremes]
  );

  return (
    <div className="max-w-5xl mx-auto px-6 pt-8 pb-8 space-y-10">
      {/* Hero Section: Current Status — editorial grid layout */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
        <div className="lg:col-span-7">
          <HeroSection
            stationName={station.name}
            state={state}
            isLive={isLive}
            isFavorite={isFavorite(stationId)}
            onToggleFavorite={() => toggleFavorite(stationId)}
          />
        </div>
        <div className="lg:col-span-5 grid grid-cols-2 gap-4">
          <TideMetricCard
            extreme={state?.nextHigh ?? null}
            label="Próxima pleamar"
            icon="arrow_upward"
          />
          <TideMetricCard
            extreme={state?.nextLow ?? null}
            label="Próxima bajamar"
            icon="arrow_downward"
          />
        </div>
      </section>

      {/* Tide alert banner — spring/neap tide warning based on lunar phase */}
      {tideAlert && (
        <section
          role="alert"
          aria-label={tideAlert.title}
          className={`rounded-2xl p-5 flex items-center gap-4 ${
            tideAlert.severity === "high"
              ? "bg-error text-on-error"
              : tideAlert.severity === "moderate"
                ? "bg-tertiary text-white"
                : "bg-secondary-container text-on-secondary-container"
          }`}
        >
          <div
            className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
              tideAlert.severity === "info"
                ? "bg-secondary/20"
                : "bg-surface-container-lowest/20"
            }`}
          >
            <span
              className="material-symbols-outlined text-xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {tideAlert.icon}
            </span>
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-xs uppercase tracking-wider">
              {tideAlert.title}
            </h4>
            <p
              className={`text-xs mt-0.5 ${
                tideAlert.severity === "info"
                  ? "text-on-secondary-container/80"
                  : "text-white/80"
              }`}
            >
              {tideAlert.message}
            </p>
          </div>
        </section>
      )}

      {/* Tidal Rhythm Graph — editorial card */}
      <section className="relative bg-surface-container-low rounded-3xl p-8 overflow-hidden min-h-[400px] flex flex-col justify-between">
        <div className="flex justify-between items-start relative z-10">
          <div>
            <h3 className="font-headline font-bold text-2xl text-primary">
              Ritmo de mareas
            </h3>
            <p className="text-sm text-on-surface-variant">
              Previsión astronómica 24 horas
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setView("today")}
              className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${
                view === "today"
                  ? "bg-surface-container-highest text-primary"
                  : "text-on-surface-variant hover:text-primary"
              }`}
            >
              Hoy
            </button>
            <button
              onClick={() => setView("7day")}
              className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${
                view === "7day"
                  ? "bg-surface-container-highest text-primary"
                  : "text-on-surface-variant hover:text-primary"
              }`}
            >
              7 días
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center min-h-[260px]">
            <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center text-on-surface-variant min-h-[260px]">
            <span className="material-symbols-outlined text-3xl mb-2">
              cloud_off
            </span>
            <p className="text-sm">{error}</p>
            <button
              onClick={fetchTideData}
              className="mt-2 text-xs text-primary font-semibold"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <div className="relative z-10 mt-4">
            <TideCurve
              points={points}
              extremes={extremes}
              obsPoints={obsPoints}
              fcstPoints={fcstPoints}
              view={view}
              currentTime={currentTime}
              height={280}
            />
          </div>
        )}
      </section>

      {/* Weather & Environmental Bento Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <WindCard
          windSpeed={weather?.windSpeed ?? null}
          windDirection={weather?.windDirection ?? null}
          windGusts={weather?.windGusts ?? null}
          isLoading={weatherLoading}
        />
        <MarineCard
          waveHeight={marine?.waveHeight ?? null}
          wavePeriod={marine?.wavePeriod ?? null}
          seaTemp={marine?.seaTemp ?? null}
          visibility={weather?.visibility ?? null}
          isLoading={weatherLoading}
        />
        <CelestialCard lat={station.lat} lon={station.lon} />
        <MapCard station={station} />
        <SpeciesClosureCard
          closureInfo={closureInfo}
          isLoading={closureLoading}
        />
      </section>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-5xl mx-auto px-6 pt-8 pb-8 flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
