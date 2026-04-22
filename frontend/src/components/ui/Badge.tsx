import { classNames } from "@/lib/utils";

const CONDITION_MAP: Record<string, { label: string; color: string }> = {
  "New":            { label: "New",       color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
  "New other":      { label: "New Other", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  "Manufacturer refurbished": { label: "Refurb", color: "bg-sky-500/20 text-sky-300 border-sky-500/40" },
  "Seller refurbished":       { label: "Seller Refurb", color: "bg-sky-500/10 text-sky-400 border-sky-500/30" },
  "Used":           { label: "Used",      color: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
  "For parts or not working": { label: "Parts Only", color: "bg-rose-500/20 text-rose-300 border-rose-500/40" },
};

interface BadgeProps {
  condition?: string | null;
  className?: string;
}

export function Badge({ condition, className }: BadgeProps) {
  const info = condition ? CONDITION_MAP[condition] : null;
  const label = info?.label ?? condition ?? "Unknown";
  const color = info?.color ?? "bg-slate-700/40 text-slate-400 border-slate-600/40";

  return (
    <span
      className={classNames(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        color,
        className
      )}
    >
      {label}
    </span>
  );
}
