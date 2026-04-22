import { ReactNode } from "react";
import { classNames } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon?: ReactNode;
  trend?: "up" | "down" | "neutral";
}

export function StatCard({ label, value, sub, icon, trend }: StatCardProps) {
  const trendConfig = {
    up: { color: "text-primary", icon: <TrendingUp className="h-3 w-3" /> },
    down: { color: "text-danger", icon: <TrendingDown className="h-3 w-3" /> },
    neutral: { color: "text-muted-foreground", icon: <Minus className="h-3 w-3" /> },
  };

  const trendInfo = trend ? trendConfig[trend] : null;

  return (
    <div className="group relative rounded-2xl border border-border bg-card p-5 transition-all hover:border-border-highlight glow-card">
      {/* Subtle corner accent */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/5 to-transparent rounded-tr-2xl pointer-events-none" />
      
      <div className="relative flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {label}
          </span>
          {icon && (
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground group-hover:text-primary transition-colors">
              {icon}
            </span>
          )}
        </div>

        {/* Value */}
        <p className="text-3xl font-bold text-foreground tracking-tight">{value}</p>

        {/* Subtitle with trend */}
        {sub && (
          <div className={classNames("flex items-center gap-1.5 text-xs font-medium", trendInfo?.color ?? "text-muted-foreground")}>
            {trendInfo?.icon}
            <span>{sub}</span>
          </div>
        )}
      </div>
    </div>
  );
}
