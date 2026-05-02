"use client";

import type { ReactNode } from "react";
import { classNames } from "@/lib/utils";

interface QuotaMetricCardProps {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  /** Tailwind text-color class for the icon (e.g. "text-primary") */
  iconColor: string;
  /** Optional sub-label under the value */
  hint?: string;
}

/**
 * Top-row metric card mirroring the reference image's
 * "Total Packets / Total Bytes / Packets/sec / Suspicious" cards.
 */
export function QuotaMetricCard({
  label,
  value,
  icon,
  iconColor,
  hint,
}: QuotaMetricCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            {label}
          </span>
          <span className="text-2xl font-bold tabular-nums tracking-tight text-foreground">
            {value}
          </span>
          {hint && (
            <span className="text-[11px] text-muted-foreground">{hint}</span>
          )}
        </div>
        <div className={classNames("flex h-8 w-8 items-center justify-center", iconColor)}>
          {icon}
        </div>
      </div>
    </div>
  );
}
