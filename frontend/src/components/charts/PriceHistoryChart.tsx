"use client";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { SoldListing } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

interface PriceHistoryChartProps {
  history: SoldListing[];
  avgSoldPrice?: number | null;
  maxBuyPrice?: number | null;
}

export function PriceHistoryChart({ history, avgSoldPrice, maxBuyPrice }: PriceHistoryChartProps) {
  const data = history.map((s) => ({
    date: formatDate(s.sold_date),
    price: s.sold_price,
    rawDate: s.sold_date,
  }));

  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-800/60 p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">
        Sold Price History
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="date"
            tick={{ fill: "#64748b", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fill: "#64748b", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `$${v}`}
            width={56}
          />
          <Tooltip
            contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12 }}
            labelStyle={{ color: "#94a3b8", fontSize: 11 }}
            itemStyle={{ color: "#a78bfa" }}
            formatter={(v) => [formatCurrency(v as number), "Sold"]}
          />
          {avgSoldPrice && (
            <ReferenceLine
              y={avgSoldPrice}
              stroke="#34d399"
              strokeDasharray="4 3"
              label={{ value: "Avg", fill: "#34d399", fontSize: 10, position: "right" }}
            />
          )}
          {maxBuyPrice && (
            <ReferenceLine
              y={maxBuyPrice}
              stroke="#f43f5e"
              strokeDasharray="4 3"
              label={{ value: "Max Buy", fill: "#f43f5e", fontSize: 10, position: "right" }}
            />
          )}
          <Line
            type="monotone"
            dataKey="price"
            stroke="#a78bfa"
            strokeWidth={2}
            dot={{ fill: "#a78bfa", r: 3 }}
            activeDot={{ r: 5, fill: "#7c3aed" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
