import type { TideExtreme } from "@/lib/tides/types";

interface TideMetricCardProps {
  extreme: TideExtreme | null;
  label: string;
  icon: string;
}

export default function TideMetricCard({
  extreme,
  label,
  icon,
}: TideMetricCardProps) {
  const time = extreme
    ? new Date(extreme.time).toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "--:--";

  const height = extreme ? `${extreme.height.toFixed(1)} m` : "-- m";
  const isHigh = extreme?.type === "high";

  return (
    <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0_8px_24px_rgba(0,42,72,0.04)] space-y-1 flex-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
          {label}
        </span>
        <span
          className={`material-symbols-outlined text-[18px] ${
            isHigh ? "text-secondary" : "text-tertiary"
          }`}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {icon}
        </span>
      </div>
      <div className="text-2xl font-headline font-bold text-primary">
        {time}
      </div>
      <div
        className={`text-sm font-semibold ${
          isHigh ? "text-secondary" : "text-tertiary"
        }`}
      >
        {extreme ? (isHigh ? "+" : "") : ""}
        {height}
      </div>
    </div>
  );
}
