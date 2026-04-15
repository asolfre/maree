"use client";

import { useMemo } from "react";
import { calculateSunTimes, getGaliciaTimezoneOffset } from "@/lib/sun";

interface CelestialCardProps {
  lat: number;
  lon: number;
}

/**
 * Celestial card for the bento grid.
 * Editorial design: bg-primary dark theme, h-64, md:col-span-1.
 */
export default function CelestialCard({ lat, lon }: CelestialCardProps) {
  const sunTimes = useMemo(() => {
    const now = new Date();
    const offset = getGaliciaTimezoneOffset(now);
    return calculateSunTimes(now, lat, lon, offset);
  }, [lat, lon]);

  const dayHours = Math.floor(sunTimes.dayLengthMinutes / 60);
  const dayMins = sunTimes.dayLengthMinutes % 60;

  return (
    <div className="bg-primary text-on-primary p-8 rounded-2xl flex flex-col justify-between h-64 md:col-span-1">
      <div className="flex justify-between items-start">
        <span
          className="material-symbols-outlined text-3xl text-tertiary"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          wb_twilight
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-on-primary/50">
          Celestial
        </span>
      </div>
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b border-on-primary/10 pb-2">
          <span className="text-sm font-medium text-on-primary/70">
            Amanecer
          </span>
          <span className="font-headline font-bold">{sunTimes.sunrise}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-on-primary/70">
            Atardecer
          </span>
          <span className="font-headline font-bold">{sunTimes.sunset}</span>
        </div>
        <div className="pt-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-primary/40">
            {dayHours}h {dayMins}m de luz
          </span>
        </div>
      </div>
    </div>
  );
}
