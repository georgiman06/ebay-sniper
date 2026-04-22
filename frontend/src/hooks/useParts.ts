"use client";
import useSWR from "swr";
import { getParts } from "@/lib/api";

export function useParts() {
  const { data, error, isLoading, mutate } = useSWR("/parts", getParts, {
    refreshInterval: 30_000,
  });
  return { parts: data ?? [], error, isLoading, mutate };
}
