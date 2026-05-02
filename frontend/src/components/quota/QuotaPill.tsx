"use client";

import Link from "next/link";
import { useQuotaStatus, tierColors } from "@/hooks/useQuotaStatus";
import { classNames } from "@/lib/utils";

/**
 * Tier 1 — ambient pill in the top nav.
 *
 * Always visible (when data is available). Pairs visually with the existing
 * "● Live" indicator and clicks through to the full /api dashboard.
 *
 * - Hidden entirely while the first poll is in flight (avoids a layout flash)
 * - Tooltip on hover shows the breakdown per service
 */
export function QuotaPill() {
  const { data, loading } = useQuotaStatus();
  if (loading || !data) return null;

  const colors = tierColors(data.overall_tier);
  const pct = Math.round(
    Math.max(
      ...Object.values(data.services).map((s) => s.pct * 100)
    )
  );

  const tooltip = Object.values(data.services)
    .map((s) => `${s.label}: ${s.used.toLocaleString()} / ${s.limit.toLocaleString()}`)
    .join("\n");

  return (
    <Link
      href="/api"
      title={tooltip}
      className={classNames(
        "hidden sm:inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors hover:border-border-highlight",
        colors.bg,
        colors.border,
        colors.text
      )}
      aria-label={`API quota at ${pct}%`}
    >
      <span
        className={classNames(
          "inline-block h-1.5 w-1.5 rounded-full",
          colors.dot,
          data.overall_tier !== "green" ? "pulse-glow" : ""
        )}
      />
      <span className="font-mono tabular-nums">{pct}%</span>
    </Link>
  );
}
