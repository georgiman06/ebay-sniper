"use client";

import Link from "next/link";
import { useState } from "react";
import {
  useQuotaStatus,
  tierColors,
  timeUntilReset,
} from "@/hooks/useQuotaStatus";
import { classNames } from "@/lib/utils";

/**
 * Tier 2 — banner that only renders when quota crosses a threshold.
 *
 * - Hidden in green
 * - Yellow at 70-90%: "Approaching daily limit"
 * - Red at 90%+: "Search quota nearly exhausted, showing cached results"
 * - Exhausted at 100%: "Quota reached. Resets in Xh Ym"
 *
 * User can dismiss; reappears on the next threshold change so they're not
 * left in the dark when things actually break.
 */
export function QuotaBanner() {
  const { data } = useQuotaStatus();
  const [dismissedTier, setDismissedTier] = useState<string | null>(null);

  if (!data || data.overall_tier === "green") return null;
  if (dismissedTier === data.overall_tier) return null;

  // Find the worst service so we can name it specifically.
  const worst = Object.values(data.services).reduce((a, b) =>
    a.pct >= b.pct ? a : b
  );
  const colors = tierColors(data.overall_tier);

  const message = (() => {
    switch (data.overall_tier) {
      case "yellow":
        return `Approaching ${worst.label} ${worst.window} limit (${worst.used.toLocaleString()} / ${worst.limit.toLocaleString()}).`;
      case "red":
        return `${worst.label} quota nearly exhausted (${worst.used.toLocaleString()} / ${worst.limit.toLocaleString()}). Showing cached results where possible.`;
      case "exhausted":
        return `${worst.label} quota reached. Resets in ${timeUntilReset(worst.resets_at_unix)}.`;
      default:
        return "";
    }
  })();

  return (
    <div
      role="status"
      className={classNames(
        "border-b backdrop-blur-xl",
        colors.bg,
        colors.border
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-2 text-xs">
        <div className="flex items-center gap-2.5">
          <span
            className={classNames(
              "inline-block h-1.5 w-1.5 rounded-full pulse-glow",
              colors.dot
            )}
          />
          <span className={classNames("font-medium", colors.text)}>
            {message}
          </span>
          <Link
            href="/api"
            className="text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
          >
            View details
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setDismissedTier(data.overall_tier)}
          aria-label="Dismiss"
          className="text-muted-foreground hover:text-foreground transition-colors text-base leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
}
