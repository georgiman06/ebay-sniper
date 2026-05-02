"use client";

import { useEffect, useState } from "react";

export type QuotaTier = "green" | "yellow" | "red" | "exhausted";

export interface QuotaService {
  key: string;
  label: string;
  window: "daily" | "monthly";
  used: number;
  failed: number;
  limit: number;
  pct: number;
  tier: QuotaTier;
  resets_at_unix: number;
}

export interface QuotaStatus {
  generated_at_unix: number;
  overall_tier: QuotaTier;
  totals: { calls_today: number; failed: number };
  services: Record<string, QuotaService>;
}

const POLL_MS = 60_000;

/**
 * Polls /api/v1/health/quota every minute. The endpoint is unauthenticated
 * by design so the nav pill works pre-login and we can hit it with curl
 * during incidents. The polling cadence is deliberately slow — we don't
 * want quota tracking to itself eat quota or hammer the DB.
 */
export function useQuotaStatus(): {
  data: QuotaStatus | null;
  loading: boolean;
  error: string | null;
} {
  const [data, setData] = useState<QuotaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const base =
      process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
    let cancelled = false;

    const tick = async () => {
      try {
        const res = await fetch(`${base}/health/quota`, { cache: "no-store" });
        if (!res.ok) throw new Error(`quota ${res.status}`);
        const json = (await res.json()) as QuotaStatus;
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return { data, loading, error };
}

/** Tailwind class fragment for the active tier. Used by all quota UI. */
export function tierColors(tier: QuotaTier): {
  text: string;
  bg: string;
  border: string;
  ring: string;
  dot: string;
} {
  switch (tier) {
    case "green":
      return {
        text: "text-primary",
        bg: "bg-primary/10",
        border: "border-primary/30",
        ring: "ring-primary/40",
        dot: "bg-primary",
      };
    case "yellow":
      return {
        text: "text-warning",
        bg: "bg-warning/10",
        border: "border-warning/30",
        ring: "ring-warning/40",
        dot: "bg-warning",
      };
    case "red":
    case "exhausted":
      return {
        text: "text-danger",
        bg: "bg-danger/10",
        border: "border-danger/30",
        ring: "ring-danger/40",
        dot: "bg-danger",
      };
  }
}

/** Human-readable countdown to next reset. */
export function timeUntilReset(unix: number): string {
  const ms = unix * 1000 - Date.now();
  if (ms <= 0) return "now";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h >= 24) {
    const d = Math.floor(h / 24);
    return `${d}d ${h % 24}h`;
  }
  if (h >= 1) return `${h}h ${m}m`;
  return `${m}m`;
}
