import { ActiveListing } from "@/lib/types";
import { formatCurrency, formatPercent, classNames } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { ExternalLink, DollarSign, Truck, Gavel, Zap } from "lucide-react";

interface DealCardProps {
  deal: ActiveListing;
  minMargin?: number;
}

export function DealCard({ deal, minMargin = 0 }: DealCardProps) {
  const aboveThreshold = (deal.margin_pct ?? 0) >= minMargin * 100;
  const marginPct = deal.margin_pct ?? 0;
  
  const marginColor =
    marginPct >= 30
      ? "text-primary"
      : marginPct >= 15
      ? "text-warning"
      : "text-danger";

  const marginBg =
    marginPct >= 30
      ? "bg-primary/10 border-primary/20"
      : marginPct >= 15
      ? "bg-warning/10 border-warning/20"
      : "bg-danger/10 border-danger/20";

  return (
    <div
      className={classNames(
        "group relative flex flex-col rounded-2xl border bg-card transition-all duration-300 glow-card",
        aboveThreshold 
          ? "border-border hover:border-primary/30" 
          : "border-border/50 opacity-50"
      )}
    >
      {/* Header with image */}
      <div className="flex gap-4 p-4 pb-3">
        {deal.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={deal.image_url}
            alt={deal.title}
            className="w-20 h-20 rounded-xl object-cover flex-shrink-0 bg-secondary border border-border"
          />
        ) : (
          <div className="w-20 h-20 rounded-xl bg-secondary flex-shrink-0 flex items-center justify-center border border-border">
            <DollarSign className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1 flex flex-col">
          <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
            {deal.title}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5 items-center">
            <Badge condition={deal.condition} />
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
              {deal.listing_type === "AUCTION" ? (
                <>
                  <Gavel className="h-3 w-3" />
                  Auction
                </>
              ) : (
                <>
                  <Zap className="h-3 w-3" />
                  Buy Now
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Price metrics */}
      <div className="grid grid-cols-3 gap-2 px-4 pb-3">
        <PriceBox 
          label="Cost" 
          value={formatCurrency(deal.total_cost)}
          sub={deal.shipping_cost != null && deal.shipping_cost > 0 ? (
            <span className="flex items-center gap-0.5 text-muted-foreground">
              <Truck className="h-2.5 w-2.5" />
              +{formatCurrency(deal.shipping_cost)}
            </span>
          ) : undefined}
        />
        <PriceBox 
          label="Max Buy" 
          value={formatCurrency(deal.max_buy_price)} 
          muted 
        />
        <PriceBox 
          label="Margin" 
          value={formatPercent(marginPct)}
          valueClass={marginColor}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-secondary/30 rounded-b-2xl">
        <span className={classNames(
          "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold",
          marginBg,
          marginColor
        )}>
          <DollarSign className="h-3 w-3" />
          {formatCurrency(deal.estimated_profit)} profit
        </span>
        <a
          href={deal.listing_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
        >
          View on eBay
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

function PriceBox({ 
  label, 
  value, 
  sub, 
  muted,
  valueClass 
}: { 
  label: string; 
  value: string; 
  sub?: React.ReactNode;
  muted?: boolean;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl bg-secondary/50 border border-border/50 p-2">
      <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className={classNames(
        "text-sm font-bold mt-0.5",
        valueClass ?? (muted ? "text-muted-foreground" : "text-foreground")
      )}>
        {value}
      </span>
      {sub && <span className="text-[9px] mt-0.5">{sub}</span>}
    </div>
  );
}
