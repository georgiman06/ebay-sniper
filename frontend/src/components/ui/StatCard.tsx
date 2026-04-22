import { ReactNode } from "react";
import { classNames } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon?: ReactNode;
  trend?: "up" | "down" | "neutral";
}

export function StatCard({ label, value, sub, icon, trend }: StatCardProps) {
  const trendColor =
    trend === "up"
      ? "text-emerald-400"
      : trend === "down"
      ? "text-rose-400"
      : "text-slate-400";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-800/60 backdrop-blur-sm p-5 flex flex-col gap-2 shadow-lg">
      {/* Glow accent */}
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-violet-600/10 blur-2xl pointer-events-none" />
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          {label}
        </span>
        {icon && <span className="text-slate-500">{icon}</span>}
      </div>
      <p className="text-3xl font-bold text-white leading-none">{value}</p>
      {sub && (
        <p className={classNames("text-xs font-medium", trendColor)}>{sub}</p>
      )}
    </div>
  );
}
