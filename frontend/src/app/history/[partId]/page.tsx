"use client";
import { use } from "react";
import useSWR from "swr";
import { getPriceHistory } from "@/lib/api";
import { useParts } from "@/hooks/useParts";
import { PriceHistoryChart } from "@/components/charts/PriceHistoryChart";
import { MovingAverageChart } from "@/components/charts/MovingAverageChart";
import { StatCard } from "@/components/ui/StatCard";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { ArrowLeft, Loader2 } from "lucide-react";
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
    <div className="flex flex-col gap-6">
      {/* Back */}
      <Link
        href="/parts"
        id="back-to-parts"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors w-fit"
      >
        <ArrowLeft size={14} /> Back to Parts
      </Link>

      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          {part?.name ?? "Price History"}
        </h1>
        {part?.category && (
          <p className="text-sm text-slate-400 mt-0.5">{part.category}</p>
        )}
      </div>

      {/* Stats row */}
      {part && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Avg Sold Price" value={formatCurrency(part.avg_sold_price)} />
          <StatCard label="Median Sold" value={formatCurrency(part.median_sold_price)} />
          <StatCard label="Max Buy Price" value={formatCurrency(part.max_buy_price)} />
          <StatCard
            label="Target Margin"
            value={formatPercent((part.effective_margin ?? 0.3) * 100)}
          />
        </div>
      )}

      {/* Charts */}
      {isLoading ? (
        <div className="flex justify-center py-20 text-slate-500">
          <Loader2 className="animate-spin" size={28} />
        </div>
      ) : history.length === 0 ? (
        <div className="py-20 text-center text-slate-500 text-sm">
          No price history yet. Trigger a refresh on this part to populate data.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <PriceHistoryChart
            history={history}
            avgSoldPrice={part?.avg_sold_price}
            maxBuyPrice={part?.max_buy_price}
          />
          <MovingAverageChart history={history} window={5} />
        </div>
      )}

      {/* Raw data table */}
      {history.length > 0 && (
        <div className="rounded-2xl border border-slate-700/60 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/60 bg-slate-800/80">
                {["Title", "Sold Price", "Date", "Condition", "Used in Avg"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-slate-400"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((s) => (
                <tr key={s.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                  <td className="px-4 py-3 text-slate-300 max-w-xs truncate">{s.title}</td>
                  <td className="px-4 py-3 font-mono font-semibold text-violet-300">{formatCurrency(s.sold_price)}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{new Date(s.sold_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{s.condition ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold ${s.is_used_in_avg ? "text-emerald-400" : "text-slate-600"}`}>
                      {s.is_used_in_avg ? "✓ Yes" : "No"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
