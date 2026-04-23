import { classNames } from "@/lib/utils";

const CONDITION_MAP: Record<string, { label: string; color: string }> = {
  "New": { 
    label: "New", 
    color: "bg-primary/10 text-primary border-primary/20" 
  },
  "New other": { 
    label: "New Other", 
    color: "bg-primary/5 text-primary/80 border-primary/15" 
  },
  "Manufacturer refurbished": { 
    label: "Refurb", 
    color: "bg-blue-500/10 text-blue-400 border-blue-500/20" 
  },
  "Seller refurbished": { 
    label: "Seller Refurb", 
    color: "bg-blue-500/5 text-blue-400/80 border-blue-500/15" 
  },
  "Used": { 
    label: "Used", 
    color: "bg-warning/10 text-warning border-warning/20" 
  },
  "For parts or not working": { 
    label: "Parts Only", 
    color: "bg-danger/10 text-danger border-danger/20" 
  },
};

interface BadgeProps {
  condition?: string | null;
  className?: string;
}

export function Badge({ condition, className }: BadgeProps) {
  const info = condition ? CONDITION_MAP[condition] : null;
  const label = info?.label ?? condition ?? "Unknown";
  const color = info?.color ?? "bg-secondary text-muted-foreground border-border";

  return (
    <span
      className={classNames(
        "inline-flex items-center rounded-lg border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        color,
        className
      )}
    >
      {label}
    </span>
  );
}
