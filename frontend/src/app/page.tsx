"use client";
import { useState } from "react";
import { useParts } from "@/hooks/useParts";
import { useSniper } from "@/hooks/useSniper";
import { useRefresh } from "@/hooks/useRefresh";
import { StatCard } from "@/components/ui/StatCard";
import { MarginSlider } from "@/components/ui/MarginSlider";
import { SniperFeed } from "@/components/sniper/SniperFeed";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { RefreshCw, Package, TrendingUp, DollarSign, Target, Zap } from "lucide-react";

export default function DashboardPage() {
  const { parts } = useParts();
  const { deals } = useSniper(undefined, false);
  const { triggerRefreshAll } = useRefresh();
  const [minMargin, setMinMargin] = useState(0.0);
  const [dealsOnly, setDealsOnly] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const activeParts = parts.filter((p) => p.is_active).length;
  const dealCount = deals.filter((d) => d.is_deal).length;
  const avgMargin =
    deals.length > 0
      ? deals.reduce((s, d) => s + (d.margin_pct ?? 0), 0) / deals.length
      : null;
  const bestDeal = deals.reduce(
    (best, d) => (!best || (d.margin_pct ?? 0) > (best.margin_pct ?? 0) ? d : best),
    deals[0] as (typeof deals)[0] | undefined
  );

  async function handleRefresh() {
    setRefreshing(true);
    await triggerRefreshAll();
    setRefreshing(false);
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Hero Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="flex h-2 w-2 rounded-full bg-primary pulse-glow" />
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">
              Live Feed
            </span>
          </div>
          <h1 className="text-4xl font-bold text-foreground tracking-tight">
            Sniper Dashboard
          </h1>
          <p className="text-muted-foreground mt-2 max-w-md">
            Real-time deal scanner. Find profitable eBay listings instantly.
          </p>
        </div>
        <button
          id="refresh-all-btn"
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2.5 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-60 px-5 py-3 text-sm font-semibold text-primary-foreground transition-all shadow-lg shadow-primary/20"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Scanning..." : "Refresh All"}
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Parts"
          value={String(activeParts)}
          icon={<Package className="h-4 w-4" />}
          sub={`${parts.length} total tracked`}
        />
        <StatCard
          label="Live Deals"
          value={String(dealCount)}
          icon={<Target className="h-4 w-4" />}
          trend="up"
          sub="under max buy price"
        />
        <StatCard
          label="Avg Margin"
          value={avgMargin != null ? formatPercent(avgMargin) : "--"}
          icon={<TrendingUp className="h-4 w-4" />}
          trend={avgMargin && avgMargin > 20 ? "up" : "neutral"}
          sub="across all deals"
        />
        <StatCard
          label="Best Deal"
          value={bestDeal ? formatCurrency(bestDeal.total_cost) : "--"}
          icon={<DollarSign className="h-4 w-4" />}
          sub={bestDeal ? `${formatPercent(bestDeal.margin_pct)} margin` : "no deals yet"}
          trend="up"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-border bg-card px-6 py-4">
        <MarginSlider value={minMargin} onChange={setMinMargin} />
        <div className="h-8 w-px bg-border hidden sm:block" />
        <label className="flex items-center gap-3 cursor-pointer select-none group">
          <div className="relative">
            <input
              id="deals-only-toggle"
              type="checkbox"
              checked={dealsOnly}
              onChange={(e) => setDealsOnly(e.target.checked)}
              className="peer sr-only"
            />
            <div className="h-6 w-11 rounded-full bg-secondary peer-checked:bg-primary transition-colors" />
            <div className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-foreground shadow-sm transition-transform peer-checked:translate-x-5" />
          </div>
          <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
            Deals only
          </span>
        </label>
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <Zap className="h-3.5 w-3.5 text-primary" />
          <span>{deals.length} listings loaded</span>
        </div>
      </div>

      {/* Feed */}
      <SniperFeed dealsOnly={dealsOnly} minMargin={minMargin} />
    </div>
  );
}
