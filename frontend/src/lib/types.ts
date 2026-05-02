export interface FeeBreakdown {
  gross_revenue: number;
  ebay_fee_rate: number;
  ebay_fee_amt: number;
  outbound_ship: number;
  net_revenue: number;
  target_margin: number;
  max_buy_price: number;
}

export interface Part {
  id: string;
  name: string;
  category: string;
  search_query: string;
  is_active: boolean;
  target_margin_override: number | null;
  ebay_fee_override: number | null;
  outbound_shipping: number | null;
  avg_sold_price: number | null;
  median_sold_price: number | null;
  sample_size: number | null;
  last_refreshed_at: string | null;
  created_at: string;
  updated_at: string | null;
  effective_margin: number | null;
  effective_fee: number | null;
  effective_shipping: number | null;
  max_buy_price: number | null;
  fee_breakdown: FeeBreakdown | null;
  avg_deal_margin: number | null;
}

export interface PartCreate {
  name: string;
  category: string;
  search_query: string;
  target_margin_override?: number | null;
}

export interface PartUpdate {
  is_active?: boolean;
  target_margin_override?: number | null;
}

export interface ActiveListing {
  id: string;
  part_id: string;
  ebay_item_id: string;
  title: string;
  current_price: number;
  shipping_cost: number | null;
  total_cost: number;
  condition: string | null;
  listing_type: "BIN" | "AUCTION";
  end_time: string | null;
  listing_url: string;
  image_url: string | null;
  max_buy_price: number | null;
  estimated_profit: number | null;
  margin_pct: number | null;
  is_deal: boolean;
  fetched_at: string;
}

export interface SoldListing {
  id: string;
  part_id: string;
  ebay_item_id: string;
  title: string;
  sold_price: number;
  sold_date: string;
  condition: string | null;
  is_used_in_avg: boolean;
}
