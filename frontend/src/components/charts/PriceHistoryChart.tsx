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
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
        <XAxis
          dataKey="date"
          tick={{ fill: "#737373", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fill: "#737373", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `$${v}`}
          width={56}
        />
        <Tooltip
          contentStyle={{ background: "#0a0a0a", border: "1px solid #1f1f1f", borderRadius: 12 }}
          labelStyle={{ color: "#737373", fontSize: 11 }}
          itemStyle={{ color: "#10b981" }}
          formatter={(v) => [formatCurrency(v as number), "Sold"]}
        />
        {avgSoldPrice && (
          <ReferenceLine
            y={avgSoldPrice}
            stroke="#10b981"
            strokeDasharray="4 3"
            label={{ value: "Avg", fill: "#10b981", fontSize: 10, position: "right" }}
          />
        )}
        {maxBuyPrice && (
          <ReferenceLine
            y={maxBuyPrice}
            stroke="#ef4444"
            strokeDasharray="4 3"
            label={{ value: "Max Buy", fill: "#ef4444", fontSize: 10, position: "right" }}
          />
        )}
        <Line
          type="monotone"
          dataKey="price"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ fill: "#10b981", r: 3 }}
          activeDot={{ r: 5, fill: "#059669" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
