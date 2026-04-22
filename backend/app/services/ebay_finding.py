"""
eBay Finding API — findCompletedItems (SOLD listings ONLY)
-----------------------------------------------------------
CRITICAL FILTERS ENFORCED:
  1. SoldItemsOnly = true         → only completed SALES (not unsold)
  2. Condition != 7000            → exclude "For Parts/Not Working"
  3. LocatedIn = US               → US market pricing only
  4. Title exclusion patterns     → applied BEFORE sending to cleaner
  5. Single-unit guard            → reject titles with "lot", "bundle", "x2"

This is the single most important service in the app.
Every downstream calculation depends on clean data here.
"""
import httpx
import logging
import re
from datetime import datetime, timezone
from app.config import settings
from app.services.ebay_auth import get_access_token

logger = logging.getLogger(__name__)

FINDING_API_URL  = "https://svcs.ebay.com/services/search/FindingService/v1"
MAX_RESULTS_PER_PAGE = 100
MAX_PAGES = 3

# Pre-filter at query time — don't waste API calls on known garbage
TITLE_GARBAGE_RE = re.compile(
    r"\b(lot|bundle|for\s+parts|not\s+working|as.?is|broken|damaged|"
    r"read\s+desc|parts\s+only|\d+\s*x\s+|pair\s+of|qty|quantity)\b",
    re.IGNORECASE,
)


from app.services.ebay_scraper import fetch_with_cache

async def fetch_sold_listings(search_query: str, condition_filter: str = "working") -> list[dict]:
    """
    Fetches SOLD completed listings for a given search query.
    Now uses the Playwright Scraper (with 24h Postgres cache)
    instead of the deprecated/rate-limited Finding API.
    """
    all_listings = await fetch_with_cache(search_query, condition_filter)
    
    # Still apply our quick-fail title garbage regex before hitting the cleaner
    clean_listings = []
    for item in all_listings:
        title = item.get("title", "")
        # Fast-reject obvious garbage
        if TITLE_GARBAGE_RE.search(title):
            continue
        # Hard floor — $10 minimum to filter $0.99 bids that didn't sell
        if item.get("total_cost", 0) < 10.0:
            continue
            
        clean_listings.append(item)
        
    return clean_listings


def _parse_item(item: dict) -> dict | None:
    """
    Parses a single Finding API item. Returns None if the title
    contains garbage patterns — fail fast before the cleaner.
    """
    try:
        title = item.get("title", [""])[0]

        # Fast-reject obvious garbage at parse time
        if TITLE_GARBAGE_RE.search(title):
            return None

        selling  = item.get("sellingStatus", [{}])[0]
        shipping = item.get("shippingInfo",  [{}])[0]
        listing  = item.get("listingInfo",   [{}])[0]

        sold_price = float(
            selling.get("currentPrice", [{}])[0].get("__value__", 0)
        )

        # Hard floor — $10 minimum to filter $0.99 bids that didn't sell
        if sold_price < 10.0:
            return None

        ship_raw      = shipping.get("shippingServiceCost", [{}])[0].get("__value__")
        shipping_cost = float(ship_raw) if ship_raw else 0.0
        total_cost    = sold_price + shipping_cost

        end_time_str = listing.get("endTime", [None])[0]
        sold_date = (
            datetime.fromisoformat(end_time_str.replace("Z", "+00:00"))
            if end_time_str
            else datetime.now(timezone.utc)
        )

        return {
            "ebay_item_id":  item.get("itemId",       [None])[0],
            "title":         title,
            "sold_price":    sold_price,
            "shipping_cost": shipping_cost,
            "total_cost":    total_cost,
            "condition":     item.get("condition", [{}])[0]
                                 .get("conditionDisplayName", ["Unknown"])[0],
            "sold_date":     sold_date,
            "listing_url":   item.get("viewItemURL", [None])[0],
        }

    except (IndexError, KeyError, ValueError, TypeError) as e:
        logger.debug("Skipping malformed item: %s", e)
        return None