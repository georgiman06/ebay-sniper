"use client";
import { useCallback, useRef } from "react";
import { refreshAll } from "@/lib/api";
import { useSWRConfig } from "swr";

export function useRefresh() {
  const { mutate } = useSWRConfig();
  const loading = useRef(false);

  const triggerRefreshAll = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    try {
      await refreshAll();
      // Revalidate all relevant keys after a short delay for background task
      setTimeout(() => {
        mutate("/parts");
        mutate((key: string) => key.startsWith("/sniper"));
      }, 3000);
    } finally {
      loading.current = false;
    }
  }, [mutate]);

  return { triggerRefreshAll };
}
