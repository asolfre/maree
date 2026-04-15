"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Station } from "@/lib/tides/types";

interface StationMapProps {
  stations: Station[];
  selectedStation?: Station;
  onStationSelect?: (station: Station) => void;
  height?: string;
  /** Center coordinates [lat, lon] */
  center?: [number, number];
  zoom?: number;
  /** Live tide heights keyed by station ID (meters). */
  tideHeights?: Record<string, number>;
  /** Show floating zoom & location controls. Default true. */
  showControls?: boolean;
}

/** Tile URLs for light and dark modes */
const TILE_LIGHT = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_DARK =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

function isDarkMode() {
  return document.documentElement.classList.contains("dark");
}

/**
 * Read resolved CSS custom-property values for marker/popup styling.
 */
function getMapColors() {
  const s = getComputedStyle(document.documentElement);
  const get = (name: string, fallback: string) =>
    s.getPropertyValue(name).trim() || fallback;
  return {
    primary: get("--color-primary", "#002a48"),
    secondary: get("--color-secondary", "#146a5a"),
    onPrimary: get("--color-on-primary", "#ffffff"),
    surface: get("--color-surface", "#f7fafc"),
    surfaceContainer: get("--color-surface-container", "#ebeef0"),
    onSurface: get("--color-on-surface", "#181c1e"),
    onSurfaceVariant: get("--color-on-surface-variant", "#42474e"),
  };
}

export default function StationMap({
  stations,
  selectedStation,
  onStationSelect,
  height = "100%",
  center = [42.8, -8.3],
  zoom = 8,
  tideHeights = {},
  showControls = true,
}: StationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [themeRev, setThemeRev] = useState(0);

  // Watch for .dark class toggling on <html>
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setThemeRev((r) => r + 1);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center,
      zoom,
      zoomControl: false,
      attributionControl: false,
    });

    const tileUrl = isDarkMode() ? TILE_DARK : TILE_LIGHT;
    const tileLayer = L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(map);
    tileLayerRef.current = tileLayer;

    L.control
      .attribution({ position: "bottomleft", prefix: false })
      .addAttribution("OSM")
      .addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swap tile layer when theme changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const oldTile = tileLayerRef.current;
    if (!map || !oldTile) return;

    const tileUrl = isDarkMode() ? TILE_DARK : TILE_LIGHT;
    const newTile = L.tileLayer(tileUrl, { maxZoom: 19 });

    map.removeLayer(oldTile);
    newTile.addTo(map);
    tileLayerRef.current = newTile;
  }, [themeRev]);

  // Fly to selected station when it changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedStation) return;
    map.flyTo([selectedStation.lat, selectedStation.lon], 11, {
      duration: 0.8,
    });
  }, [selectedStation]);

  // Update markers when stations, selection, or theme changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const colors = getMapColors();

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    // Create custom icon — uses theme-aware colors and optional tide height
    const createIcon = (isSelected: boolean, tideHeight?: number) => {
      const hasHeight = tideHeight !== undefined;
      const heightLabel = hasHeight ? `${tideHeight.toFixed(1)}m` : "";

      // When we have a tide height, show a badge-style marker with the value
      if (hasHeight) {
        return L.divIcon({
          className: "custom-marker",
          html: `<div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
          ">
            <div style="
              background: ${isSelected ? colors.primary : colors.secondary};
              color: ${colors.onPrimary};
              padding: 3px 8px;
              border-radius: 12px;
              font-family: Manrope, sans-serif;
              font-size: 11px;
              font-weight: 800;
              white-space: nowrap;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3)${isSelected ? `, 0 0 0 3px ${colors.primary}33` : ""};
              border: 2px solid ${colors.onPrimary};
            ">${heightLabel}</div>
            <div style="
              width: 8px;
              height: 8px;
              background: ${isSelected ? colors.primary : colors.secondary};
              border-radius: 50%;
              border: 2px solid ${colors.onPrimary};
            "></div>
          </div>`,
          iconSize: [60, 36],
          iconAnchor: [30, 36],
        });
      }

      return L.divIcon({
        className: "custom-marker",
        html: `<div style="
          width: ${isSelected ? "40px" : "32px"};
          height: ${isSelected ? "40px" : "32px"};
          background: ${isSelected ? colors.primary : colors.secondary};
          border: ${isSelected ? "4px" : "2px"} solid ${colors.onPrimary};
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3)${isSelected ? `, 0 0 0 4px ${colors.primary}33` : ""};
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s;
        "><span class="material-symbols-outlined" style="
          font-size: ${isSelected ? "20px" : "14px"};
          color: ${colors.onPrimary};
          font-variation-settings: 'FILL' 1;
        ">waves</span></div>`,
        iconSize: [isSelected ? 40 : 32, isSelected ? 40 : 32],
        iconAnchor: [isSelected ? 20 : 16, isSelected ? 20 : 16],
      });
    };

    // Add markers for each station
    stations.forEach((station) => {
      const isSelected = selectedStation?.id === station.id;
      const height = tideHeights[station.id];
      const marker = L.marker([station.lat, station.lon], {
        icon: createIcon(isSelected, height),
        zIndexOffset: isSelected ? 1000 : 0,
      });

      marker.addTo(map);

      // Popup with station info — theme-aware colors
      const heightInfo =
        height !== undefined
          ? `<div style="font-family: Manrope, sans-serif; font-size: 18px; font-weight: 900; color: ${colors.primary}; margin-top: 4px;">
              ${height.toFixed(2)}m
              <span style="font-size: 10px; font-weight: 600; color: ${colors.onSurfaceVariant}; margin-left: 4px;">actual</span>
            </div>`
          : "";
      marker.bindPopup(
        `<div style="font-family: Inter, sans-serif; padding: 2px;">
          <div style="background: ${colors.primary}; color: ${colors.onPrimary}; padding: 6px 12px; border-radius: 8px 8px 0 0; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
            ${station.shortName}
          </div>
          <div style="padding: 8px 12px; background: ${colors.surfaceContainer}; border-radius: 0 0 8px 8px;">
            <div style="font-family: Manrope, sans-serif; font-size: 14px; font-weight: 800; color: ${colors.primary};">
              ${station.name}
            </div>
            ${heightInfo}
            <div style="font-size: 11px; color: ${colors.onSurfaceVariant}; margin-top: 2px;">
              ${station.lat.toFixed(4)}°N, ${Math.abs(station.lon).toFixed(4)}°W
            </div>
          </div>
        </div>`,
        { closeButton: false, offset: [0, -8], className: "custom-popup" }
      );

      marker.on("click", () => {
        onStationSelect?.(station);
      });
    });
  }, [stations, selectedStation, onStationSelect, tideHeights, themeRev]);

  // ---- Map control handlers ----
  function handleZoomIn() {
    mapInstanceRef.current?.zoomIn();
  }
  function handleZoomOut() {
    mapInstanceRef.current?.zoomOut();
  }
  function handleLocateMe() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapInstanceRef.current?.flyTo(
          [pos.coords.latitude, pos.coords.longitude],
          12,
          { duration: 1 }
        );
      },
      () => {
        // Geolocation denied — ignore silently
      },
      { timeout: 5000, maximumAge: 60_000 }
    );
  }

  return (
    <div style={{ height, width: "100%", borderRadius: "inherit", position: "relative" }}>
      <div
        ref={mapRef}
        style={{ height: "100%", width: "100%", borderRadius: "inherit" }}
      />
      {showControls && (
        <div
          style={{ position: "absolute", top: 24, right: 24, zIndex: 1000 }}
          className="flex flex-col gap-3"
        >
          <button
            onClick={handleZoomIn}
            className="w-12 h-12 bg-surface-container-lowest rounded-xl shadow-lg flex items-center justify-center text-primary hover:bg-surface-bright transition-all active:scale-95"
            aria-label="Acercar mapa"
          >
            <span className="material-symbols-outlined">add</span>
          </button>
          <button
            onClick={handleZoomOut}
            className="w-12 h-12 bg-surface-container-lowest rounded-xl shadow-lg flex items-center justify-center text-primary hover:bg-surface-bright transition-all active:scale-95"
            aria-label="Alejar mapa"
          >
            <span className="material-symbols-outlined">remove</span>
          </button>
          <button
            onClick={handleLocateMe}
            className="w-12 h-12 bg-primary text-on-primary rounded-xl shadow-lg flex items-center justify-center hover:opacity-90 transition-all active:scale-95 mt-4"
            aria-label="Ir a mi ubicación"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              my_location
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
