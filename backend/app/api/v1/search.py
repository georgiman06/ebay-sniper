"""
Search API — The Primary Entry Point
--------------------------------------
This is the FIRST thing the user interacts with.
Flow:
  1. User types a part name (e.g. "RTX 3080")
  2. We preview sold data from eBay (without adding to tracker)
  3. User sees: avg price, max buy price, # of comps, price distribution
  4. User decides: "Add to Tracker" or dismiss
  5. We record the search for suggestion engine fuel

GET  /search/preview?q=RTX+3080        → live preview (no DB write)
POST /search/add                        → add to tracker + record history
GET  /search/suggestions                → Instagram-style "track these too"
GET  /search/history                    → what the user has searched
"""
import logging
from fastapi import APIRouter, Depends, Query, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.limiter import limiter

from app.database import get_db
from app.models.part import TrackedPart
from app.models.search_history import SearchHistory
from app.services.ebay_finding import fetch_sold_listings
from app.services.data_cleaner import clean_listings, compute_averages
from app.services.suggestions_service import get_suggestions, record_search
from app.services.refresh_service import refresh_part
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Search"])


@router.get("/search/preview")
@limiter.limit("10/minute")
async def preview_search(
    request: Request,
    q: str = Query(..., min_length=2, max_length=100, description="Part name e.g. 'RTX 3080'"),
    condition: str = Query("working", pattern="^(working|parts|new)$", description="working, parts, or new"),
):
    """
    Live preview of sold data for a query.
    Shows the user what data exists BEFORE they commit to tracking.
    No DB writes. Designed to be fast and informative.
    """
    if not q.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    # Build a clean eBay query from the user's raw input
    clean_query = _build_clean_query(q, condition)

    raw      = await fetch_sold_listings(clean_query, condition)
    cleaned  = clean_listings(raw, q)
    averages = compute_averages(cleaned)

    if not averages["avg_sold_price"]:
        return {
            "query":        q,
            "clean_query":  clean_query,
            "status":       "no_data",
            "message":      "No sold listings found. Try a more specific search term.",
            "suggestions":  _query_suggestions(q),
        }

    avg    = averages["avg_sold_price"]
    margin = settings.global_default_margin
    fee    = settings.ebay_fee_rate

    # Same fee-corrected formula used by refresh_service and parts._enrich():
    #   net_revenue   = avg_sold × (1 - ebay_fee_rate)
    #   max_buy_price = net_revenue × (1 - target_margin)
    # This ensures what users see in the preview matches what gets tracked.
    net_revenue    = avg * (1 - fee)
    max_buy_price  = round(net_revenue * (1 - margin), 2)
    est_profit     = round(net_revenue - max_buy_price, 2)

    # Price distribution for the chart preview
    clean_prices = sorted([
        i["total_cost"] for i in cleaned if i.get("is_used_in_avg")
    ])

    return {
        "query":           q,
        "clean_query":     clean_query,
        "status":          "ok",
        "avg_sold_price":  avg,
        "median_price":    averages["median_sold_price"],
        "sample_size":     averages["sample_size"],
        "price_range": {
            "min": clean_prices[0]  if clean_prices else None,
            "max": clean_prices[-1] if clean_prices else None,
        },
        "max_buy_price":   max_buy_price,
        "target_margin":   margin,
        "ebay_fee_rate":   fee,
        "net_revenue":     round(net_revenue, 2),
        "estimated_profit_per_flip": est_profit,
        # Sample of recent sold titles (for user to validate relevance)
        "recent_sold_titles": [
            {
                "title": i["title"], 
                "price": i["total_cost"], 
                "date": str(i["sold_date"])[:10],
                "url": i.get("listing_url")
            }
            for i in sorted(cleaned, key=lambda x: x["sold_date"], reverse=True)
            if i.get("is_used_in_avg")
        ][:15],
    }


@router.post("/search/add")
async def add_to_tracker(
    q: str = Query(..., min_length=2, max_length=100, description="Raw query from the user"),
    name: str = Query(..., min_length=2, max_length=120, description="Display name e.g. 'NVIDIA RTX 3080'"),
    category: str = Query(..., min_length=2, max_length=60, description="Category e.g. 'GPUs'"),
    db: AsyncSession = Depends(get_db),
):
    """
    Adds a searched part to the tracker AND records the search.
    Triggers an immediate background refresh so data appears right away.
    """
    clean_query = _build_clean_query(q)

    # Check for duplicates
    existing = await db.execute(
        select(TrackedPart).where(TrackedPart.search_query == clean_query)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Already tracking this part")

    # Quick sold data fetch to get avg price for history record
    raw      = await fetch_sold_listings(clean_query)
    cleaned  = clean_listings(raw, q)
    averages = compute_averages(cleaned)

    # Create the tracked part
    part = TrackedPart(
        name=name,
        category=category,
        search_query=clean_query,
        avg_sold_price=averages["avg_sold_price"],
        median_sold_price=averages["median_sold_price"],
        sample_size=averages["sample_size"],
    )
    db.add(part)
    await db.flush()
    await db.refresh(part)

    # Record in search history (was_added=True boosts future suggestions)
    await record_search(
        db=db,
        raw_query=q,
        clean_query=clean_query,
        resolved_name=name,
        category=category,
        avg_price=averages["avg_sold_price"],
        was_added=True,
    )

    await db.commit()

    effective_margin = settings.global_default_margin
    max_buy_price = (
        round(part.avg_sold_price * (1 - effective_margin), 2)
        if part.avg_sold_price else None
    )

    return {
        "status":          "added",
        "part_id":         str(part.id),
        "name":            part.name,
        "avg_sold_price":  part.avg_sold_price,
        "max_buy_price":   max_buy_price,
        "sample_size":     part.sample_size,
    }


@router.get("/search/suggestions")
async def get_smart_suggestions(
    limit: int = Query(8, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns Instagram-style "You may also want to track" suggestions.
    Based on: brand family, category siblings, search history, price tier.
    """
    suggestions = await get_suggestions(db, limit=limit)
    return {
        "count":       len(suggestions),
        "suggestions": suggestions,
    }


@router.get("/search/history")
async def get_search_history(
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Returns the user's search history, most recent first."""
    result = await db.execute(
        select(SearchHistory)
        .order_by(SearchHistory.last_searched_at.desc())
        .limit(limit)
    )
    return result.scalars().all()


@router.post("/search/record")
async def record_search_event(
    q: str = Query(..., min_length=2, max_length=100),
    category: str = Query(None, max_length=60),
    db: AsyncSession = Depends(get_db),
):
    """
    Records a search without adding to tracker.
    Called when user previews but doesn't add — still valuable signal.
    """
    clean_query = _build_clean_query(q)
    await record_search(
        db=db,
        raw_query=q,
        clean_query=clean_query,
        category=category,
        was_added=False,
    )
    await db.commit()
    return {"status": "recorded"}


# ── Helpers ───────────────────────────────────────────────────────────────────

import re as _re

# Variant suffixes that indicate a premium product SKU.
# Used to auto-exclude them from the eBay query when not already specified.
_VARIANT_SUFFIXES = ["Ti", "Super", "Ti Super", "XT", "XTX", "GRE", "X3D", "KS"]
_MODEL_NUMBER_RE  = _re.compile(r'\b(\d{3,5})\b')


def _variant_exclusions(base: str) -> str:
    """
    If the query contains a numeric model (e.g. '3080') but does NOT already
    specify a variant suffix, auto-append eBay minus-filters so eBay itself
    excludes the premium variants before results are fetched. This saves
    ScraperAPI credits and reduces variant contamination at the source.

    Examples:
      "rtx 3080"     → appends: -"3080 Ti" -"3080 Super" -"3080 XT" ...
      "rtx 3080 ti"  → no exclusions (Ti is the target, keep it)
      "rtx"          → no model number found, no exclusions
    """
    model_match = _MODEL_NUMBER_RE.search(base)
    if not model_match:
        return ""

    model_num = model_match.group(1)
    base_lower = base.lower()

    exclusions = []
    for suffix in _VARIANT_SUFFIXES:
        if suffix.lower() not in base_lower:
            exclusions.append(f'-"{model_num} {suffix}"')

    return " ".join(exclusions)


def _build_clean_query(raw: str, condition: str = "working") -> str:
    """
    Converts a user's raw input into a clean eBay search query.
    Adds standard exclusions (damage/bulk) + variant exclusions (Ti/Super/XT)
    to maximise data quality for PC parts pricing.
    """
    base = raw.strip()

    # Don't double-add exclusions if user already put them in
    if "-" in base:
        return base

    if condition.lower() == "parts":
        return base
    elif condition.lower() == "new":
        return base
    else:
        damage_exclusions  = '-"for parts" -broken -faulty -lot -bundle -damaged -untested'
        variant_exclusions = _variant_exclusions(base)
        parts = filter(None, [f"{base} used", damage_exclusions, variant_exclusions])
        return " ".join(parts)


def _query_suggestions(q: str) -> list[str]:
    """
    When a search returns no data, suggest refinements.
    """
    base = q.strip()
    return [
        f"{base} used",
        f"{base} working",
        f'"{base}"',
        f"{base} unlocked" if "phone" in q.lower() or "iphone" in q.lower() else f"{base} tested",
    ]