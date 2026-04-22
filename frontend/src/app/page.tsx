"use client";
import { useState } from "react";
import { useParts } from "@/hooks/useParts";
import { useSniper } from "@/hooks/useSniper";
import { useRefresh } from "@/hooks/useRefresh";
import { StatCard } from "@/components/ui/StatCard";
import { MarginSlider } from "@/components/ui/MarginSlider";
import { SniperFeed } from "@/components/sniper/SniperFeed";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { RefreshCw, Package, TrendingUp, DollarSign, Target } from "lucide-react";

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Sniper Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">Real-time deal feed sorted by margin</p>
        </div>
        <button
          id="refresh-all-btn"
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-60 px-4 py-2.5 text-sm font-semibold text-white transition-colors shadow-lg shadow-violet-900/30"
        >
          <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Refreshing…" : "Refresh All"}
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Parts"
          value={String(activeParts)}
          icon={<Package size={16} />}
        />
        <StatCard
          label="Live Deals"
          value={String(dealCount)}
          icon={<Target size={16} />}
          trend="up"
          sub="listings under max buy"
        />
        <StatCard
          label="Avg Margin"
          value={avgMargin != null ? formatPercent(avgMargin) : "—"}
          icon={<TrendingUp size={16} />}
          trend={avgMargin && avgMargin > 20 ? "up" : "neutral"}
        />
        <StatCard
          label="Best Deal"
          value={bestDeal ? formatCurrency(bestDeal.total_cost) : "—"}
          icon={<DollarSign size={16} />}
          sub={bestDeal ? `${formatPercent(bestDeal.margin_pct)} margin` : undefined}
          trend="up"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-5 rounded-2xl border border-slate-700/60 bg-slate-800/40 px-5 py-3.5">
        <MarginSlider value={minMargin} onChange={setMinMargin} />
        <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer select-none">
          <input
            id="deals-only-toggle"
            type="checkbox"
            checked={dealsOnly}
            onChange={(e) => setDealsOnly(e.target.checked)}
            className="accent-violet-500 w-4 h-4"
          />
          Deals only
        </label>
      </div>

      {/* Feed */}
      <SniperFeed dealsOnly={dealsOnly} minMargin={minMargin} />
    </div>
  );
}
