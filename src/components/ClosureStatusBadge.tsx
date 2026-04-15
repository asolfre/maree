"use client";

/**
 * Small pill badge showing closure status for a species.
 *
 * Three states:
 * - "open"         → green pill "Abierta"
 * - "closed"       → red pill "Veda activa"
 * - "closing_soon" → amber pill "Veda próxima"
 */

import type { ClosureStatus } from "@/lib/species/types";

interface ClosureStatusBadgeProps {
  status: ClosureStatus;
  /** Optional: show remaining/upcoming days */
  days?: number | null;
  /** Compact mode — smaller text, no day count */
  compact?: boolean;
}

const STATUS_CONFIG: Record<
  ClosureStatus,
  { label: string; bg: string; text: string; icon: string }
> = {
  open: {
    label: "Abierta",
    bg: "bg-secondary-container",
    text: "text-on-secondary-container",
    icon: "check_circle",
  },
  closed: {
    label: "Veda activa",
    bg: "bg-error-container",
    text: "text-on-error-container",
    icon: "block",
  },
  closing_soon: {
    label: "Veda próxima",
    bg: "bg-tertiary-container",
    text: "text-on-tertiary-container",
    icon: "schedule",
  },
};

export default function ClosureStatusBadge({
  status,
  days,
  compact = false,
}: ClosureStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wider ${config.bg} ${config.text} ${
        compact ? "px-2 py-0.5 text-[9px]" : "px-3 py-1 text-[10px]"
      }`}
    >
      <span
        className={`material-symbols-outlined ${compact ? "text-xs" : "text-sm"}`}
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        {config.icon}
      </span>
      {config.label}
      {!compact && days !== null && days !== undefined && (
        <span className="opacity-70">
          {status === "closed"
            ? `· ${days}d restantes`
            : status === "closing_soon"
              ? `· en ${days}d`
              : ""}
        </span>
      )}
    </span>
  );
}
