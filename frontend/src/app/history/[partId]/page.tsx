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
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Back Link */}
        <Link
          href="/#parts"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit group mb-10"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Parts
        </Link>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="tagline-line" />
            <span className="text-sm text-muted-foreground tracking-wide">
              Price history analysis
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-semibold text-foreground tracking-tight">
            {part?.name ?? "Loading..."}
          </h1>
          {part?.category && (
            <p className="text-muted-foreground mt-3">
              {part.category} / {part.search_query}
            </p>
          )}
        </div>

        {/* Stats */}
        {part && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
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
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading price history...</p>
            </div>
          </div>
        ) : history.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-16">
            <div className="flex flex-col items-center justify-center gap-4">
              <BarChart3 className="h-10 w-10 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium text-foreground">No price history yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Trigger a refresh on this part to populate data
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-10">
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
                Price Distribution
              </h3>
              <PriceHistoryChart
                history={history}
                avgSoldPrice={part?.avg_sold_price}
                maxBuyPrice={part?.max_buy_price}
              />
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
                Moving Average (5-day)
              </h3>
              <MovingAverageChart history={history} window={5} />
            </div>
          </div>
        )}

        {/* Raw Data Table */}
        {history.length > 0 && (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="font-medium text-foreground">Sold Listings Data</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {history.length} listings analyzed
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {["Title", "Sold Price", "Date", "Condition", "Used in Avg"].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {history.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3 text-foreground max-w-xs truncate">
                        {s.title}
                      </td>
                      <td className="px-5 py-3 font-semibold text-primary tabular-nums">
                        {formatCurrency(s.sold_price)}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground text-xs">
                        {new Date(s.sold_date).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                          {s.condition ?? "--"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={classNames(
                            "inline-flex items-center gap-1 text-xs font-medium",
                            s.is_used_in_avg ? "text-primary" : "text-muted-foreground/50"
                          )}
                        >
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
    </div>
  );
}
