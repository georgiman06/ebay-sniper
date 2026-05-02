import type { Part, PartCreate, PartUpdate, ActiveListing, SoldListing } from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? "";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(API_KEY ? { "X-API-Key": API_KEY } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Parts ────────────────────────────────────────────────────────────────────
export const getParts = () => req<Part[]>("/parts");

export const createPart = (body: PartCreate) =>
  req<Part>("/parts", { method: "POST", body: JSON.stringify(body) });

export const updatePart = (id: string, body: PartUpdate) =>
  req<Part>(`/parts/${id}`, { method: "PATCH", body: JSON.stringify(body) });

export const deletePart = (id: string) =>
  req<void>(`/parts/${id}`, { method: "DELETE" });

// ── Sniper / Listings ────────────────────────────────────────────────────────
export const getSniperDeals = (partId?: string, dealsOnly = true) => {
  const params = new URLSearchParams({ deals_only: String(dealsOnly) });
  if (partId) params.set("part_id", partId);
  return req<ActiveListing[]>(`/sniper?${params}`);
};

export const getPriceHistory = (partId: string, cleanOnly = true) =>
  req<SoldListing[]>(`/history/${partId}?clean_only=${cleanOnly}`);

// ── Refresh ──────────────────────────────────────────────────────────────────
export const refreshPart = (id: string) =>
  req<{ status: string; part_id: string }>(`/refresh/${id}`, { method: "POST" });

export const deepFetchPart = (id: string) =>
  req<{ status: string; part_id: string }>(`/refresh/${id}/deep`, { method: "POST" });

export const refreshAll = () =>
  req<{ status: string }>("/refresh/all", { method: "POST" });

export const clearScrapeCache = () =>
  req<{ status: string; rows_deleted: number }>("/refresh/cache", { method: "DELETE" });

// ── Search & Discover ────────────────────────────────────────────────────────
export interface SearchPreviewResult {
  query: string;
  clean_query: string;
  status: "ok" | "no_data";
  message?: string;
  suggestions?: string[];
  
  // Only present if status === "ok"
  avg_sold_price?: number;
  median_price?: number;
  sample_size?: number;
  price_range?: { min: number; max: number };
  max_buy_price?: number;
  target_margin?: number;
  estimated_profit_per_flip?: number;
  recent_sold_titles?: { title: string; price: number; date: string; url?: string }[];
}

export interface SuggestionItem {
  clean_query: string;
  resolved_name?: string;
  category?: string;
  brand?: string;
  avg_price_at_search?: number;
  search_count: number;
}

export interface SearchHistoryItem {
  id: string;
  raw_query: string;
  clean_query: string;
  resolved_name?: string;
  category?: string;
  avg_price_at_search?: number;
  last_searched_at: string;
}

export const previewSearch = (q: string, condition: string = "working") =>
  req<SearchPreviewResult>(`/search/preview?q=${encodeURIComponent(q)}&condition=${encodeURIComponent(condition)}`);

export const addToTracker = (q: string, name: string, category: string) =>
  req<{ status: string; part_id: string; max_buy_price: number }>(
    `/search/add?q=${encodeURIComponent(q)}&name=${encodeURIComponent(name)}&category=${encodeURIComponent(category)}`,
    { method: "POST" }
  );

export const recordSearchEvent = (q: string, category?: string) => {
  let url = `/search/record?q=${encodeURIComponent(q)}`;
  if (category) url += `&category=${encodeURIComponent(category)}`;
  return req<{ status: string }>(url, { method: "POST" });
};

export const getSearchSuggestions = (limit = 8) =>
  req<{ count: number; suggestions: SuggestionItem[] }>(`/search/suggestions?limit=${limit}`);

export const getSearchHistory = (limit = 10) =>
  req<SearchHistoryItem[]>(`/search/history?limit=${limit}`);

