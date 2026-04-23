"use client";
import { useSniper } from "@/hooks/useSniper";
import { DealCard } from "./DealCard";
import { Loader2, Radio, AlertCircle } from "lucide-react";

interface SniperFeedProps {
  partId?: string;
  dealsOnly?: boolean;
  minMargin?: number;
}

export function SniperFeed({ partId, dealsOnly = true, minMargin = 0 }: SniperFeedProps) {
  const { deals, isLoading, error } = useSniper(partId, dealsOnly);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-card border border-border">
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Scanning for deals</p>
          <p className="text-xs text-muted-foreground mt-1">Analyzing live listings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-danger/20 bg-danger/5 p-8">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 border border-danger/20">
            <AlertCircle className="h-5 w-5 text-danger" />
          </div>
          <div>
            <p className="text-sm font-medium text-danger">Connection Error</p>
            <p className="text-xs text-muted-foreground mt-1">
              Failed to load listings. Is the backend running?
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (deals.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary border border-border">
            <Radio className="h-7 w-7 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">No deals found</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Try refreshing or adjusting the minimum margin filter to see more results.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {deals.map((deal) => (
        <DealCard key={deal.id} deal={deal} minMargin={minMargin} />
      ))}
    </div>
  );
}
