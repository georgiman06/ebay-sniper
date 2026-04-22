"use client";
import { useSniper } from "@/hooks/useSniper";
import { DealCard } from "./DealCard";
import { Loader2, Radar } from "lucide-react";

interface SniperFeedProps {
  partId?: string;
  dealsOnly?: boolean;
  minMargin?: number;
}

export function SniperFeed({ partId, dealsOnly = true, minMargin = 0 }: SniperFeedProps) {
  const { deals, isLoading, error } = useSniper(partId, dealsOnly);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
        <Loader2 className="animate-spin" size={28} />
        <p className="text-sm">Scanning deals…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-center text-rose-300 text-sm">
        Failed to load listings. Is the backend running?
      </div>
    );
  }

  if (deals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
        <Radar size={36} className="opacity-40" />
        <p className="text-sm">No deals found. Try refreshing or adjusting margin.</p>
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
