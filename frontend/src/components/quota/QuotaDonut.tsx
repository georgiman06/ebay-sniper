"use client";

import { tierColors, type QuotaTier } from "@/hooks/useQuotaStatus";
import { classNames } from "@/lib/utils";

interface QuotaDonutProps {
  pct: number; // 0..1
  tier: QuotaTier;
  centerNumber: string;
  centerLabel: string;
  bottomLabel: string;
  bottomSubLabel?: string;
  size?: number;
}

/**
 * Hollow ring + center number visual, matching the reference image's
 * Download/Upload donuts. Stroke width and centre typography are tuned
 * to feel proportional at the default 200px size.
 */
export function QuotaDonut({
  pct,
  tier,
  centerNumber,
  centerLabel,
  bottomLabel,
  bottomSubLabel,
  size = 200,
}: QuotaDonutProps) {
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, pct));
  const offset = circumference * (1 - clamped);
  const colors = tierColors(tier);

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative"
        style={{ width: size, height: size }}
        role="img"
        aria-label={`${centerLabel}: ${Math.round(clamped * 100)} percent`}
      >
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="var(--border)"
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            fill="none"
            className={classNames(colors.text, "transition-[stroke-dashoffset] duration-700 ease-out")}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={classNames(
              "text-3xl font-bold tabular-nums tracking-tight",
              colors.text
            )}
          >
            {centerNumber}
          </span>
          <span className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
            {centerLabel}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-center gap-0.5 text-center">
        <span className="text-sm font-medium text-foreground">{bottomLabel}</span>
        {bottomSubLabel && (
          <span className="text-xs text-muted-foreground">{bottomSubLabel}</span>
        )}
      </div>
    </div>
  );
}
