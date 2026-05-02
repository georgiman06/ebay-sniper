"""
eBay Browse API — Live Active Listings for Sniper Dashboard
------------------------------------------------------------
Uses the modern Browse API (REST/JSON) unlike the older Finding API.
Fetches active Buy It Now + ending-soon auctions.
Pre-computes is_deal, margin_pct, estimated_profit at ingest time.
"""
import httpx
import logging
from datetime import datetime, timezone
from app.config import settings
from app.services.ebay_auth import get_access_token
from app.services.quota_tracker import reserve, record_failure, QuotaExceededError

logger = logging.getLogger(__name__)

BROWSE_API_URL = f"{settings.ebay_browse_api_url}/item_summary/search"
MAX_ACTIVE_RESULTS = 50  # Top 50 deals is plenty for a sniper view


async def fetch_active_listings(
    search_query: str,
    max_buy_price: float,
    avg_sold_price: float,
    target_margin: float,
) -> list[dict]:
    """
    Fetches live active listings and pre-computes deal metrics.
    
    Args:
        search_query:   eBay boolean search string
        max_buy_price:  avg_sold_price * (1 - target_margin) — the ceiling
        avg_sold_price: used to compute margin_pct
        target_margin:  e.g. 0.30 for 30%
    
    Returns:
        List of enriched listing dicts ready for DB insert
    """
    # Reserve a quota slot before making the call. If the daily ceiling has
    # been hit, raise so callers can surface a user-friendly 429 / skip the
    # refresh cleanly instead of pounding the API.
    if not await reserve("ebay_browse"):
        raise QuotaExceededError("ebay_browse")

    token = await get_access_token()

    # Strip control chars/whitespace defensively. httpx rejects any non-printable
    # ASCII in URLs or headers, and search_query / env-loaded URLs have been
    # the source of "Invalid non-printable ASCII character in URL" crashes.
    safe_query = "".join(c for c in (search_query or "") if c.isprintable()).strip()
    safe_url = "".join(c for c in BROWSE_API_URL if c.isprintable()).strip()

    headers = {
        "Authorization": f"Bearer {token}",
        "X-EBAY-C-MARKETPLACE-ID": settings.ebay_marketplace_id,
    }

    params = {
        "q":           safe_query,
        "sort":        "price",              # cheapest first = best deals first
        "limit":       str(MAX_ACTIVE_RESULTS),
        "filter":      _build_filters(max_buy_price),
        "fieldgroups": "EXTENDED",           # includes shipping cost
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            response = await client.get(safe_url, headers=headers, params=params)
            response.raise_for_status()
            data = response.json()
        except httpx.HTTPError as e:
            logger.error("Browse API request failed: %s | url=%r | q=%r", e, safe_url, safe_query)
            await record_failure("ebay_browse")
            return []

    items = data.get("itemSummaries", [])
    if not items:
        logger.info("No active listings found for query: %s", search_query)
        return []

    enriched = []
    for item in items:
        parsed = _parse_active_item(item, max_buy_price, avg_sold_price)
        if parsed:
            enriched.append(parsed)

    logger.info(
        "Browse API complete | query='%s' | found=%d | deals=%d",
        search_query,
        len(enriched),
        sum(1 for i in enriched if i["is_deal"]),
    )
    return enriched


def _build_filters(max_buy_price: float) -> str:
    """
    eBay Browse API filter string.
    We set max price to 110% of max_buy_price to catch near-deals too
    (user might negotiate or find price drops).
    """
    price_ceiling = round(max_buy_price * 1.10, 2)
    return (
        f"price:[..{price_ceiling}],"          # price up to 110% of threshold
        "priceCurrency:USD,"
        "itemLocationCountry:US,"
        "conditions:{USED|VERY_GOOD|GOOD|ACCEPTABLE|SELLER_REFURBISHED}"
    )


def _parse_active_item(
    item: dict,
    max_buy_price: float,
    avg_sold_price: float,
) -> dict | None:
    """Parses a single Browse API item summary into our schema."""
    try:
        # Price
        price_obj     = item.get("price", {})
        current_price = float(price_obj.get("value", 0))

        # Shipping
        shipping_options = item.get("shippingOptions", [])
        if shipping_options:
            ship_cost_str = (
                shipping_options[0]
                .get("shippingCost", {})
                .get("value", "0")
            )
            shipping_cost = float(ship_cost_str)
        else:
            shipping_cost = 0.0

        total_cost = current_price + shipping_cost

        # Listing type
        buying_options = item.get("buyingOptions", [])
        if "FIXED_PRICE" in buying_options:
            listing_type = "BIN"
        elif "AUCTION" in buying_options:
            listing_type = "AUCTION"
        else:
            listing_type = "UNKNOWN"

        # Auction end time (for urgency display)
        end_time = None
        if item.get("itemEndDate"):
            end_time = datetime.fromisoformat(
                item["itemEndDate"].replace("Z", "+00:00")
            )

        # Deal calculations
        is_deal         = total_cost <= max_buy_price
        estimated_profit = round(avg_sold_price - total_cost, 2) if avg_sold_price else None
        margin_pct = (
            round((estimated_profit / avg_sold_price) * 100, 1)
            if avg_sold_price and estimated_profit
            else None
        )

        return {
            "ebay_item_id":    item.get("itemId"),
            "title":           item.get("title", ""),
            "current_price":   current_price,
            "shipping_cost":   shipping_cost,
            "total_cost":      total_cost,
            "condition":       item.get("condition", "Unknown"),
            "listing_type":    listing_type,
            "end_time":        end_time,
            "listing_url":     item.get("itemWebUrl", ""),
            "image_url":       (
                item.get("image", {}).get("imageUrl")
            ),
            "max_buy_price":    round(max_buy_price, 2),
            "estimated_profit": estimated_profit,
            "margin_pct":      margin_pct,
            "is_deal":         is_deal,
        }
    except (KeyError, ValueError, TypeError) as e:
        logger.warning("Skipping malformed active listing: %s", e)
        return None