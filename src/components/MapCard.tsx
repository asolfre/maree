import type { Station } from "@/lib/tides/types";

interface MapCardProps {
  station: Station;
}

/**
 * Map card for the bento grid.
 * Editorial design: md:col-span-2, satellite image style, h-64.
 */
export default function MapCard({ station }: MapCardProps) {
  // Use OpenStreetMap tile for a static map preview
  const zoom = 12;
  const tileX = Math.floor(
    ((station.lon + 180) / 360) * Math.pow(2, zoom)
  );
  const latRad = (station.lat * Math.PI) / 180;
  const tileY = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
      Math.pow(2, zoom)
  );
  const tileUrl = `https://tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`;

  return (
    <div className="md:col-span-2 bg-surface-container rounded-2xl overflow-hidden h-64 relative">
      {/* Map tile background */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={tileUrl}
        alt={`Mapa de ${station.name}`}
        className="w-full h-full object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-primary/10" />

      {/* Station info floating card */}
      <div className="absolute top-4 right-4 bg-surface/70 backdrop-blur-md p-3 rounded-xl flex items-center gap-3 shadow-sm">
        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
          <span className="material-symbols-outlined text-white">map</span>
        </div>
        <div>
          <div className="text-xs font-bold text-primary leading-tight">
            {station.shortName}
          </div>
          <div className="text-[10px] text-on-surface-variant">
            {station.lat.toFixed(4)}°N, {Math.abs(station.lon).toFixed(4)}°W
          </div>
        </div>
      </div>
    </div>
  );
}
