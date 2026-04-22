import { ActiveListing } from "@/lib/types";
import { formatCurrency, formatPercent, classNames } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { ExternalLink, Tag, Truck } from "lucide-react";

interface DealCardProps {
  deal: ActiveListing;
  minMargin?: number;
}

export function DealCard({ deal, minMargin = 0 }: DealCardProps) {
  const aboveThreshold = (deal.margin_pct ?? 0) >= minMargin * 100;
  const marginColor =
    (deal.margin_pct ?? 0) >= 30
      ? "text-emerald-400"
      : (deal.margin_pct ?? 0) >= 15
      ? "text-amber-400"
      : "text-rose-400";

  return (
    <div
      className={classNames(
        "group relative flex flex-col gap-3 rounded-2xl border p-4 transition-all duration-200",
        "bg-slate-800/60 backdrop-blur-sm shadow-md hover:shadow-violet-900/30 hover:shadow-xl hover:-translate-y-0.5",
        aboveThreshold ? "border-slate-700/60" : "border-slate-700/30 opacity-60"
      )}
    >
      {/* Image + title row */}
      <div className="flex gap-3">
        {deal.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={deal.image_url}
            alt={deal.title}
            className="w-16 h-16 rounded-lg object-cover flex-shrink-0 bg-slate-700"
          />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-slate-700 flex-shrink-0 flex items-center justify-center text-slate-500 text-xs">
            No img
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white line-clamp-2 leading-snug">
            {deal.title}
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5 items-center">
            <Badge condition={deal.condition} />
            <span className="text-xs text-slate-400">
              {deal.listing_type === "AUCTION" ? "🔨 Auction" : "⚡ Buy It Now"}
            </span>
          </div>
        </div>
      </div>

      {/* Price row */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-slate-900/60 p-2">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">Cost</p>
          <p className="text-sm font-bold text-white">{formatCurrency(deal.total_cost)}</p>
          {deal.shipping_cost != null && deal.shipping_cost > 0 && (
            <p className="text-[10px] text-slate-500 flex items-center justify-center gap-0.5 mt-0.5">
              <Truck size={9} />+{formatCurrency(deal.shipping_cost)}
            </p>
          )}
        </div>
        <div className="rounded-lg bg-slate-900/60 p-2">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">Max Buy</p>
          <p className="text-sm font-bold text-slate-300">{formatCurrency(deal.max_buy_price)}</p>
        </div>
        <div className="rounded-lg bg-slate-900/60 p-2">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">Margin</p>
          <p className={classNames("text-sm font-bold", marginColor)}>
            {formatPercent(deal.margin_pct)}
          </p>
        </div>
      </div>

      {/* Profit pill + link */}
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 text-xs font-semibold text-emerald-300">
          <Tag size={11} />
          Est. profit: {formatCurrency(deal.estimated_profit)}
        </span>
        <a
          href={deal.listing_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
        >
          View on eBay <ExternalLink size={11} />
        </a>
      </div>
    </div>
  );
}
