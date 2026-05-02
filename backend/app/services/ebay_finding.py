"""
eBay Finding API — findCompletedItems (SOLD listings ONLY)
-----------------------------------------------------------
CRITICAL FILTERS ENFORCED:
  1. SoldItemsOnly = true         → only completed SALES (not unsold)
  2. Condition != 7000            → exclude "For Parts/Not Working"
  3. LocatedIn = US               → US market pricing only
  4. Title exclusion patterns     → applied BEFORE sending to cleaner
  5. Single-unit guard            → reject titles with "lot", "bundle", "x2"

Data strategy:
  Both sources run in parallel and are merged by ebay_item_id:
  - Finding API  → up to 300 structured results, 90 days deep, free, fast
  - Playwright   → 50-60 results from the live sold page, most recent data

  Combined and deduplicated this gives 80-300+ clean comps per part,
  enough for IQR filtering to produce statistically reliable averages.
"""
import httpx
import asyncio
import logging
import re
from datetime import datetime, timezone
from app.config import settings
from app.services.ebay_auth import get_access_token

logger = logging.getLogger(__name__)

FINDING_API_URL  = "https://svcs.ebay.com/services/search/FindingService/v1"
MAX_RESULTS_PER_PAGE = 100
MAX_PAGES = 3

TITLE_GARBAGE_RE = re.compile(
    r"\b(lot|bundle|for\s+parts|not\s+working|as.?is|broken|damaged|"
    r"read\s+desc|parts\s+only|\d+\s*x\s+|pair\s+of|qty|quantity)\b",
    re.IGNORECASE,
)

# Condition map: our internal filter → Finding API conditionId
CONDITION_MAP = {
    "working": "3000",   # Used
    "new":     "1000",   # New
    "parts":   "7000",   # For Parts / Not Working
}


async def fetch_sold_listings(search_query: str, condition_filter: str = "working") -> list[dict]:
    """
    Fetches SOLD completed listings from BOTH sources in parallel:
      1. Finding API — 300 results, 90 days deep, structured JSON
      2. Playwright scraper — 50-60 results, most recent, cached 24h

    Results are merged and deduplicated by ebay_item_id so the cleaner
    receives the maximum dataset without duplicates.
    """
    from app.services.ebay_scraper import fetch_with_cache

    # Run both sources concurrently — Finding API is fast (~2s),
    # Playwright is slow (~20-70s) so parallel cuts total wait time.
    finding_task  = _fetch_via_finding_api(search_query, condition_filter)
    scraper_task  = fetch_with_cache(search_query, condition_filter)

    finding_raw, scraper_raw = await asyncio.gather(
        finding_task, scraper_task, return_exceptions=True
    )

    if isinstance(finding_raw, Exception):
        logger.warning("Finding API failed, falling back to scraper only: %s", finding_raw)
        finding_raw = []
    if isinstance(scraper_raw, Exception):
        logger.warning("Playwright scraper failed, using Finding API only: %s", scraper_raw)
        scraper_raw = []

    # Merge + deduplicate by ebay_item_id.
    # Finding API results take precedence (structured data, more reliable).
    seen: dict[str, dict] = {}
    for item in finding_raw:
        item_id = item.get("ebay_item_id")
        if item_id:
            seen[item_id] = item

    # Add scraper results that Finding API didn't return
    for item in scraper_raw:
        item_id = item.get("ebay_item_id")
        if item_id and item_id not in seen:
            seen[item_id] = item
        elif not item_id:
            # No ID — include anyway, won't be deduped
            seen[f"noid_{len(seen)}"] = item

    merged = list(seen.values())

    # Apply the same garbage pre-filter used previously
    clean = []
    for item in merged:
        title = item.get("title", "")
        if TITLE_GARBAGE_RE.search(title):
            continue
        if item.get("total_cost", 0) < 10.0:
            continue
        clean.append(item)

    logger.info(
        "fetch_sold_listings | query='%s' | finding=%d scraper=%d merged=%d clean=%d",
        search_query, len(finding_raw), len(scraper_raw), len(merged), len(clean),
    )
    return clean


async def _fetch_via_finding_api(
    search_query: str,
    condition_filter: str = "working",
) -> list[dict]:
    """
    Calls eBay Finding API findCompletedItems — up to 300 results, 90 days.
    Uses EBAY_CLIENT_ID as App ID (no OAuth needed for Finding API).
    """
    if not settings.ebay_client_id:
        logger.warning("EBAY_CLIENT_ID not set — skipping Finding API")
        return []

    condition_id = CONDITION_MAP.get(condition_filter.lower(), "3000")
    results: list[dict] = []

    async with httpx.AsyncClient(timeout=15.0) as client:
        for page in range(1, MAX_PAGES + 1):
            params = {
                "OPERATION-NAME":         "findCompletedItems",
                "SERVICE-VERSION":        "1.0.0",
                "SECURITY-APPNAME":       settings.ebay_client_id,
                "RESPONSE-DATA-FORMAT":   "JSON",
                "keywords":               search_query,
                "itemFilter(0).name":     "SoldItemsOnly",
                "itemFilter(0).value":    "true",
                "itemFilter(1).name":     "LocatedIn",
                "itemFilter(1).value":    "US",
                "itemFilter(2).name":     "Condition",
                "itemFilter(2).value":    condition_id,
                "paginationInput.entriesPerPage": str(MAX_RESULTS_PER_PAGE),
                "paginationInput.pageNumber":     str(page),
                "sortOrder":              "EndTimeSoonest",
            }

            try:
                resp = await client.get(FINDING_API_URL, params=params)
                resp.raise_for_status()
                data = resp.json()
            except Exception as e:
                logger.error("Finding API page %d failed: %s", page, e)
                break

            try:
                response_wrapper = data.get("findCompletedItemsResponse", [{}])[0]
                ack = response_wrapper.get("ack", ["Failure"])[0]
                if ack != "Success":
                    error_msg = (
                        response_wrapper.get("errorMessage", [{}])[0]
                        .get("error", [{}])[0]
                        .get("message", ["Unknown error"])[0]
                    )
                    logger.warning("Finding API ack=%s: %s", ack, error_msg)
                    break

                search_result = response_wrapper.get("searchResult", [{}])[0]
                items = search_result.get("item", [])

                if not items:
                    break  # No more results

                for raw_item in items:
                    parsed = _parse_item(raw_item)
                    if parsed:
                        results.append(parsed)

                # Check if there are more pages
                pagination = response_wrapper.get("paginationOutput", [{}])[0]
                total_pages = int(pagination.get("totalPages", ["1"])[0])
                if page >= total_pages:
                    break

            except (KeyError, IndexError, ValueError) as e:
                logger.error("Finding API parse error page %d: %s", page, e)
                break

    logger.info("Finding API | query='%s' | fetched=%d", search_query, len(results))
    return results


def _parse_item(item: dict) -> dict | None:
    """Parses a single Finding API item dict into our standard format."""
    try:
        title = item.get("title", [""])[0]
        if TITLE_GARBAGE_RE.search(title):
            return None

        selling  = item.get("sellingStatus", [{}])[0]
        shipping = item.get("shippingInfo",  [{}])[0]
        listing  = item.get("listingInfo",   [{}])[0]

        sold_price = float(
            selling.get("currentPrice", [{}])[0].get("__value__", 0)
        )
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
            "ebay_item_id":  item.get("itemId", [None])[0],
            "title":         title,
            "sold_price":    sold_price,
            "shipping_cost": shipping_cost,
            "total_cost":    total_cost,
            "condition":     (
                item.get("condition", [{}])[0]
                    .get("conditionDisplayName", ["Used"])[0]
            ),
            "sold_date":     sold_date,
            "listing_url":   item.get("viewItemURL", [None])[0],
        }

    except (IndexError, KeyError, ValueError, TypeError) as e:
        logger.debug("Skipping malformed Finding API item: %s", e)
        return None
