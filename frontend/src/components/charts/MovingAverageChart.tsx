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
    <div className="rounded-2xl border border-slate-700/60 bg-slate-800/60 p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">
        {window}-Point Moving Average
      </p>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} width={56} />
          <Tooltip
            contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12 }}
            labelStyle={{ color: "#94a3b8", fontSize: 11 }}
            formatter={(v, name) => [formatCurrency(v as number), name === "ma" ? `${window}-pt MA` : "Sale"]}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "#64748b" }}
            formatter={(v) => (v === "ma" ? `${window}-pt MA` : "Sale Price")}
          />
          <Bar dataKey="price" fill="#7c3aed" opacity={0.35} radius={[3, 3, 0, 0]} name="price" />
          <Line type="monotone" dataKey="ma" stroke="#34d399" strokeWidth={2} dot={false} name="ma" connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
