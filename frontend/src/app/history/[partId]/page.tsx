"use client";
import { use } from "react";
import useSWR from "swr";
import { getPriceHistory } from "@/lib/api";
import { useParts } from "@/hooks/useParts";
import { PriceHistoryChart } from "@/components/charts/PriceHistoryChart";
import { MovingAverageChart } from "@/components/charts/MovingAverageChart";
import { StatCard } from "@/components/ui/StatCard";
import { formatCurrency, formatPercent, classNames } from "@/lib/utils";
import { ArrowLeft, Loader2, TrendingUp, DollarSign, Target, BarChart3, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";

export default function HistoryPage({ params }: { params: Promise<{ partId: string }> }) {
  const { partId } = use(params);
  const { parts } = useParts();
  const part = parts.find((p) => p.id === partId);

  const { data: history = [], isLoading } = useSWR(
    partId ? `/history/${partId}` : null,
    () => getPriceHistory(partId)
  );

  return (
    <div className="flex flex-col gap-8">
      {/* Back Link */}
      <Link
        href="/parts"
        id="back-to-parts"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors w-fit group"
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to Parts
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Price History
          </span>
        </div>
        <h1 className="text-4xl font-bold text-foreground tracking-tight">
          {part?.name ?? "Loading..."}
        </h1>
        {part?.category && (
          <p className="text-muted-foreground mt-2">{part.category} / {part.search_query}</p>
        )}
      </div>

      {/* Stats */}
      {part && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            label="Avg Sold Price" 
            value={formatCurrency(part.avg_sold_price)} 
            icon={<DollarSign className="h-4 w-4" />}
            sub="market average"
          />
          <StatCard 
            label="Median Sold" 
            value={formatCurrency(part.median_sold_price)} 
            icon={<TrendingUp className="h-4 w-4" />}
            sub="middle value"
          />
          <StatCard 
            label="Max Buy Price" 
            value={formatCurrency(part.max_buy_price)} 
            icon={<Target className="h-4 w-4" />}
            sub="your buy target"
            trend="up"
          />
          <StatCard
            label="Target Margin"
            value={formatPercent((part.effective_margin ?? 0.3) * 100)}
            icon={<BarChart3 className="h-4 w-4" />}
            sub="profit margin"
            trend="up"
          />
        </div>
      )}

      {/* Charts */}
      {isLoading ? (
        <div className="rounded-2xl border border-border bg-card p-16">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-card border border-border">
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Loading price history...</p>
          </div>
        </div>
      ) : history.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-16">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary border border-border">
              <BarChart3 className="h-7 w-7 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">No price history yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Trigger a refresh on this part to populate data
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Price Distribution</h3>
            <PriceHistoryChart
              history={history}
              avgSoldPrice={part?.avg_sold_price}
              maxBuyPrice={part?.max_buy_price}
            />
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Moving Average (5-day)</h3>
            <MovingAverageChart history={history} window={5} />
          </div>
        </div>
      )}

      {/* Raw Data Table */}
      {history.length > 0 && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-secondary/30">
            <h3 className="text-sm font-semibold text-foreground">Sold Listings Data</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{history.length} listings analyzed</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  {["Title", "Sold Price", "Date", "Condition", "Used in Avg"].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((s) => (
                  <tr key={s.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="px-5 py-3 text-foreground max-w-xs truncate">{s.title}</td>
                    <td className="px-5 py-3 font-mono font-semibold text-primary">{formatCurrency(s.sold_price)}</td>
                    <td className="px-5 py-3 text-muted-foreground text-xs">{new Date(s.sold_date).toLocaleDateString()}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center rounded-lg bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                        {s.condition ?? "--"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={classNames(
                        "inline-flex items-center gap-1 text-xs font-semibold",
                        s.is_used_in_avg ? "text-primary" : "text-muted-foreground/50"
                      )}>
                        {s.is_used_in_avg ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Yes
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3.5 w-3.5" />
                            No
                          </>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
