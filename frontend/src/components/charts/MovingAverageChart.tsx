"use client";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { SoldListing } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

interface MovingAverageChartProps {
  history: SoldListing[];
  window?: number;
}

function computeMA(data: { price: number }[], window: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < window - 1) return null;
    const slice = data.slice(i - window + 1, i + 1);
    return slice.reduce((sum, d) => sum + d.price, 0) / window;
  });
}

export function MovingAverageChart({ history, window = 7 }: MovingAverageChartProps) {
  const raw = history.map((s) => ({ date: formatDate(s.sold_date), price: s.sold_price }));
  const mas = computeMA(raw, window);
  const data = raw.map((d, i) => ({ ...d, ma: mas[i] }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
        <XAxis dataKey="date" tick={{ fill: "#737373", fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fill: "#737373", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} width={56} />
        <Tooltip
          contentStyle={{ background: "#0a0a0a", border: "1px solid #1f1f1f", borderRadius: 12 }}
          labelStyle={{ color: "#737373", fontSize: 11 }}
          formatter={(v, name) => [formatCurrency(v as number), name === "ma" ? `${window}-pt MA` : "Sale"]}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, color: "#737373" }}
          formatter={(v) => (v === "ma" ? `${window}-pt MA` : "Sale Price")}
        />
        <Bar dataKey="price" fill="#10b981" opacity={0.25} radius={[3, 3, 0, 0]} name="price" />
        <Line type="monotone" dataKey="ma" stroke="#34d399" strokeWidth={2} dot={false} name="ma" connectNulls />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
