"use client";

import { useState, FormEvent } from "react";
import useSWR from "swr";
import {
  previewSearch,
  addToTracker,
  getSearchSuggestions,
  getSearchHistory,
  recordSearchEvent,
  SearchPreviewResult,
} from "@/lib/api";
import { useParts } from "@/hooks/useParts";
import { useSniper } from "@/hooks/useSniper";
import { useRefresh } from "@/hooks/useRefresh";
import { StatCard } from "@/components/ui/StatCard";
import { MarginSlider } from "@/components/ui/MarginSlider";
import { SniperFeed } from "@/components/sniper/SniperFeed";
import { PartTable } from "@/components/parts/PartTable";
import { AddPartModal } from "@/components/parts/AddPartModal";
import { Part } from "@/lib/types";
import { formatCurrency, formatPercent } from "@/lib/utils";
import {
  Search,
  Loader2,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Info,
  Sparkles,
  History,
  TrendingUp,
  ShoppingCart,
  ExternalLink,
  RefreshCw,
  Package,
  DollarSign,
  Target,
  Plus,
  Database,
  Zap,
} from "lucide-react";
import dynamic from "next/dynamic";

const ParticleTorus = dynamic(
  () => import("@/components/3d/ParticleTorus"),
  { ssr: false }
);

export default function HomePage() {
  return (
    <div className="flex flex-col">
      <DiscoverSection />
      <DashboardSection />
      <PartsSection />
    </div>
  );
}

// ============================================
// DISCOVER SECTION
// ============================================
function DiscoverSection() {
  const [query, setQuery] = useState("");
  const [condition, setCondition] = useState("working");
  const [preview, setPreview] = useState<SearchPreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: suggestionsData } = useSWR("/search/suggestions", () =>
    getSearchSuggestions(6)
  );
  const { data: historyData, mutate: mutateHistory } = useSWR(
    "/search/history",
    () => getSearchHistory(6)
  );

  async function handleSearch(e: FormEvent | string) {
    if (e && typeof e !== "string" && "preventDefault" in e) e.preventDefault();
    const q = typeof e === "string" ? e : query;
    if (!q.trim()) return;

    setQuery(q);
    setLoading(true);
    setError(null);
    setPreview(null);

    try {
      const res = await previewSearch(q, condition);
      setPreview(res);
      recordSearchEvent(q).catch(console.error);
      mutateHistory();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="discover" className="min-h-screen flex flex-col">
      {/* Hero Area */}
      <div className="flex-1 flex flex-col justify-center px-6 py-20 lg:py-32 relative overflow-hidden">
        {/* 3D Particle Background */}
        <ParticleTorus />
        
        <div className="max-w-7xl mx-auto w-full relative z-10">
          <div className="max-w-3xl">
            {/* Tagline with line */}
            <div className="flex items-center gap-4 mb-8">
              <div className="tagline-line" />
              <span className="text-sm text-muted-foreground tracking-wide">
                Autonomous deal hunting for eBay resellers
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold text-foreground leading-[1.1] tracking-tight">
              Find deals,
              <br />
              <span className="text-muted-foreground">automate profit</span>
            </h1>

            {/* Search Box */}
            <div className="mt-12 max-w-2xl">
              <form onSubmit={handleSearch} className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                </div>
                <input
                  type="text"
                  className="w-full bg-card border border-border rounded-2xl py-4 pl-14 pr-[200px] text-foreground placeholder-muted-foreground focus:outline-none focus:border-border-highlight transition-all text-lg"
                  placeholder="Search any product..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <div className="absolute inset-y-2 right-2 flex items-center gap-2">
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className="bg-muted border-0 rounded-xl px-3 py-2.5 text-sm text-foreground outline-none h-full"
                  >
                    <option value="working">Used</option>
                    <option value="parts">Parts</option>
                    <option value="new">New</option>
                  </select>
                  <button
                    type="submit"
                    disabled={loading || !query.trim()}
                    className="px-5 h-full bg-foreground hover:bg-foreground/90 text-background rounded-xl font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Analyze
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="px-6 pb-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-danger/10 border border-danger/20 max-w-2xl">
              <AlertCircle className="h-5 w-5 text-danger flex-shrink-0" />
              <p className="text-sm text-danger">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Preview Results */}
      {preview && (
        <div className="px-6 pb-16">
          <div className="max-w-7xl mx-auto">
            <PreviewPanel preview={preview} />
          </div>
        </div>
      )}

      {/* Suggestions & History Grid */}
      <div className="px-6 pb-20 border-b border-border">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Suggestions */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-3 mb-5">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="font-medium text-foreground">Recommended</h3>
              </div>
              <div className="flex flex-col gap-2">
                {suggestionsData?.suggestions?.slice(0, 5).map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSearch(s.clean_query)}
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted text-left transition-all group"
                  >
                    <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                      {s.resolved_name || s.clean_query}
                    </span>
                    {s.avg_price_at_search && (
                      <span className="text-sm font-medium text-muted-foreground">
                        ${Math.round(s.avg_price_at_search)}
                      </span>
                    )}
                  </button>
                ))}
                {!suggestionsData?.suggestions?.length && (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Start searching to get recommendations
                  </p>
                )}
              </div>
            </div>

            {/* History */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-3 mb-5">
                <History className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-medium text-foreground">Recent</h3>
              </div>
              <div className="flex flex-col gap-2">
                {historyData?.slice(0, 5).map((h) => (
                  <button
                    key={h.id}
                    onClick={() => handleSearch(h.raw_query)}
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted text-left transition-all group"
                  >
                    <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                      {h.raw_query}
                    </span>
                    {h.avg_price_at_search && (
                      <span className="text-sm font-medium text-muted-foreground">
                        ${Math.round(h.avg_price_at_search)}
                      </span>
                    )}
                  </button>
                ))}
                {!historyData?.length && (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Your history will appear here
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================
// PREVIEW PANEL
// ============================================
function PreviewPanel({ preview }: { preview: SearchPreviewResult }) {
  const [name, setName] = useState(preview.query);
  const [category, setCategory] = useState("General");
  const [adding, setAdding] = useState(false);
  const [addedResult, setAddedResult] = useState<{
    ok: boolean;
    msg?: string;
  } | null>(null);

  if (preview.status === "no_data") {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center max-w-2xl">
        <Info className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-foreground">No data found</h2>
        <p className="text-muted-foreground text-sm mt-2">{preview.message}</p>
      </div>
    );
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!name || !category) return;
    setAdding(true);
    setAddedResult(null);
    try {
      await addToTracker(preview.clean_query, name, category);
      setAddedResult({ ok: true });
    } catch (err: unknown) {
      setAddedResult({
        ok: false,
        msg: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="p-8 flex flex-col lg:flex-row justify-between gap-8">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              {preview.sample_size} sales analyzed
            </span>
          </div>
          <h2 className="text-2xl font-semibold text-foreground">
            {preview.query}
          </h2>

          <div className="flex items-center gap-4 mt-6">
            <div className="px-5 py-3 rounded-xl border border-border bg-muted/50">
              <div className="text-xs text-muted-foreground mb-1">Average</div>
              <div className="text-2xl font-semibold text-foreground">
                ${preview.avg_sold_price?.toFixed(2)}
              </div>
            </div>
            <div className="px-5 py-3 rounded-xl border border-primary/30 bg-primary/5">
              <div className="text-xs text-primary mb-1">Max Buy</div>
              <div className="text-2xl font-semibold text-primary">
                ${preview.max_buy_price?.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {addedResult?.ok ? (
          <div className="flex items-center gap-3 px-6 py-4 bg-primary/5 border border-primary/20 rounded-xl">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <span className="font-medium text-primary">Added to tracker</span>
          </div>
        ) : (
          <form onSubmit={handleAdd} className="flex flex-col gap-3 lg:w-64">
            <div className="text-sm font-medium text-foreground flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-primary" />
              Track this item
            </div>
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:border-border-highlight outline-none transition-all"
              required
            />
            <input
              type="text"
              placeholder="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:border-border-highlight outline-none transition-all"
              required
            />
            <button
              type="submit"
              disabled={adding}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-foreground hover:bg-foreground/90 text-background font-medium text-sm transition-all disabled:opacity-50"
            >
              {adding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShoppingCart className="h-4 w-4" />
              )}
              {adding ? "Adding..." : "Add to Sniper"}
            </button>
            {addedResult?.msg && (
              <p className="text-xs text-danger">{addedResult.msg}</p>
            )}
          </form>
        )}
      </div>

      {preview.recent_sold_titles && preview.recent_sold_titles.length > 0 && (
        <div className="border-t border-border p-6 bg-muted/30">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
            Recent Sales
          </div>
          <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
            {preview.recent_sold_titles.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between px-4 py-3 bg-card hover:bg-muted/50 rounded-xl border border-border transition-colors"
              >
                <div className="flex-1 min-w-0 pr-4">
                  <div
                    className="text-sm text-foreground truncate"
                    title={item.title}
                  >
                    {item.title}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                    <span>{item.date}</span>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        View <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
                <div className="font-semibold text-primary">
                  ${item.price.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// DASHBOARD SECTION
// ============================================
function DashboardSection() {
  const { parts } = useParts();
  const { deals, isLoading: dealsLoading } = useSniper(undefined, false);
  const { triggerRefreshAll } = useRefresh();
  const [minMargin, setMinMargin] = useState(0.0);
  const [dealsOnly, setDealsOnly] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const activeParts = parts.filter((p) => p.is_active).length;
  const dealCount = deals.filter((d) => (d.margin_pct ?? 0) >= 20).length;
  const avgMargin =
    deals.length > 0
      ? deals.reduce((s, d) => s + (d.margin_pct ?? 0), 0) / deals.length
      : null;
  const bestDeal = deals.reduce(
    (best, d) =>
      !best || (d.margin_pct ?? 0) > (best.margin_pct ?? 0) ? d : best,
    deals[0] as (typeof deals)[0] | undefined
  );

  async function handleRefresh() {
    setRefreshing(true);
    await triggerRefreshAll();
    setRefreshing(false);
  }

  return (
    <section id="dashboard" className="py-20 px-6 border-b border-border">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="tagline-line" />
              <span className="text-sm text-muted-foreground tracking-wide">
                Real-time deal monitoring
              </span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-semibold text-foreground tracking-tight">
              Dashboard
            </h2>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-full bg-foreground hover:bg-foreground/90 disabled:opacity-60 px-5 py-2.5 text-sm font-medium text-background transition-all"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            {refreshing ? "Scanning..." : "Refresh"}
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard
            label="Active Parts"
            value={String(activeParts)}
            icon={<Package className="h-4 w-4" />}
            sub={`${parts.length} total`}
          />
          <StatCard
            label="Live Deals"
            value={String(dealCount)}
            icon={<Target className="h-4 w-4" />}
            trend="up"
            sub="20%+ margin"
          />
          <StatCard
            label="Avg Margin"
            value={avgMargin != null ? formatPercent(avgMargin) : "--"}
            icon={<TrendingUp className="h-4 w-4" />}
            trend={avgMargin && avgMargin > 20 ? "up" : "neutral"}
          />
          <StatCard
            label="Best Deal"
            value={bestDeal ? formatCurrency(bestDeal.total_cost) : "--"}
            icon={<DollarSign className="h-4 w-4" />}
            sub={
              bestDeal ? `${formatPercent(bestDeal.margin_pct ?? 0)} margin` : "--"
            }
            trend="up"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-border bg-card px-6 py-4 mb-8">
          <MarginSlider value={minMargin} onChange={setMinMargin} />
          <div className="h-6 w-px bg-border hidden sm:block" />
          <label className="flex items-center gap-3 cursor-pointer select-none group">
            <div className="relative">
              <input
                type="checkbox"
                checked={dealsOnly}
                onChange={(e) => setDealsOnly(e.target.checked)}
                className="peer sr-only"
              />
              <div className="h-5 w-9 rounded-full bg-muted peer-checked:bg-primary transition-colors" />
              <div className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-foreground shadow-sm transition-transform peer-checked:translate-x-4" />
            </div>
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
              Deals only
            </span>
          </label>
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span>{deals.length} listings</span>
          </div>
        </div>

        {/* Feed */}
        <SniperFeed dealsOnly={dealsOnly} minMargin={minMargin} />
      </div>
    </section>
  );
}

// ============================================
// PARTS SECTION
// ============================================
function PartsSection() {
  const { parts, isLoading, mutate } = useParts();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Part | null>(null);

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(part: Part) {
    setEditing(part);
    setModalOpen(true);
  }

  const activeParts = parts.filter((p) => p.is_active).length;

  return (
    <section id="parts" className="py-20 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="tagline-line" />
              <span className="text-sm text-muted-foreground tracking-wide">
                Tracked items database
              </span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-semibold text-foreground tracking-tight">
              Parts
            </h2>
            <p className="text-muted-foreground mt-3">
              {parts.length} parts tracked, {activeParts} active
            </p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 rounded-full bg-foreground hover:bg-foreground/90 px-5 py-2.5 text-sm font-medium text-background transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Part
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="rounded-2xl border border-border bg-card p-16">
            <div className="flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          </div>
        ) : parts.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-16">
            <div className="flex flex-col items-center justify-center gap-4">
              <Database className="h-10 w-10 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium text-foreground">No parts yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add parts to start tracking deals
                </p>
              </div>
            </div>
          </div>
        ) : (
          <PartTable parts={parts} onRefresh={mutate} onEdit={openEdit} />
        )}

        <AddPartModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSaved={mutate}
          editing={editing}
        />
      </div>
    </section>
  );
}
