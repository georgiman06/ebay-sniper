"use client";
import useSWR from "swr";
import { getSniperDeals } from "@/lib/api";

export function useSniper(partId?: string, dealsOnly = true) {
  const key = `/sniper?${partId ?? "all"}&dealsOnly=${dealsOnly}`;
  const { data, error, isLoading, mutate } = useSWR(
    key,
    () => getSniperDeals(partId, dealsOnly),
    { refreshInterval: 15_000 }
  );
  return { deals: data ?? [], error, isLoading, mutate };
}
