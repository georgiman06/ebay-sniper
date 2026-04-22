"""
Refresh Orchestrator
---------------------
This is the core business logic function. Both the scheduler 
AND the manual "Force Refresh" API button call this.

Flow per part:
  1. Fetch sold history (Finding API)
  2. Clean + flag outliers
  3. Upsert SoldListings to DB (skip duplicates by ebay_item_id)
  4. Compute + cache averages on TrackedPart row
  5. Compute max_buy_price using margin (per-part override or global)
  6. Fetch active listings (Browse API) with pre-computed deal flags
  7. Replace ActiveListings in DB (full swap, not append)
  8. Update last_refreshed_at timestamp
"""
import logging
import asyncio
from datetime import datetime, timezone
from sqlalchemy import select, delete
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.part import TrackedPart
from app.models.price_history import SoldListing
from app.models.active_listing import ActiveListing
from app.services.ebay_finding import fetch_sold_listings
from app.services.ebay_browse import fetch_active_listings
from app.services.data_cleaner import clean_listings, compute_averages
from app.config import settings

logger = logging.getLogger(__name__)


async def refresh_part(part: TrackedPart, db: AsyncSession) -> dict:
    """
    Full refresh cycle for a single TrackedPart.
    Returns a summary dict for logging/API response.
    """
    logger.info("Starting refresh for part: %s (id=%s)", part.name, part.id)
    summary = {"part_id": str(part.id), "part_name": part.name}

    # ── 1. Fetch Sold History ────────────────────────────────────────────────
    try:
        raw_sold = await fetch_sold_listings(part.search_query)
    except Exception as e:
        logger.error("Finding API failed: %s", e)
        raw_sold = []
        
    summary["raw_fetched"] = len(raw_sold)

    # ── 2. Clean Data ────────────────────────────────────────────────────────
    cleaned = clean_listings(raw_sold)
    averages = compute_averages(cleaned)
    summary["clean_count"] = averages["sample_size"]
    summary["avg_sold_price"] = averages["avg_sold_price"]

    # ── 3. Upsert SoldListings (skip if ebay_item_id already exists) ─────────
    inserted_count = 0
    for item in cleaned:
        if not item.get("ebay_item_id"):
            continue
        
        stmt = pg_insert(SoldListing).values(
            part_id      = part.id,
            ebay_item_id = item["ebay_item_id"],
            title        = item["title"],
            sold_price   = item["sold_price"],
            shipping_cost= item["shipping_cost"],
            total_cost   = item["total_cost"],
            condition    = item["condition"],
            sold_date    = item["sold_date"],
            listing_url  = item.get("listing_url"),
            is_outlier   = item["is_outlier"],
            outlier_reason= item.get("outlier_reason"),
            is_used_in_avg= item["is_used_in_avg"],
        ).on_conflict_do_nothing(index_elements=["ebay_item_id"])
        
        result = await db.execute(stmt)
        inserted_count += result.rowcount

    summary["inserted_sold"] = inserted_count

    # ── 4. Cache Averages on TrackedPart ─────────────────────────────────────
    # FALLBACK: If we have no sold data (rate limited), simulate an average using live active items
    avg_price = averages["avg_sold_price"]
    median_price = averages["median_sold_price"]
    
    if not avg_price:
        logger.warning(f"No sold data for {part.search_query} (Rate limit hit). Fetching active items to use as proxy average.")
        # Fetch raw active listings just for pricing context without max_buy_price filter
        active_proxy = await fetch_active_listings(part.search_query, 999999.0, None, 0)
        
        if active_proxy:
            prices = sorted([i["total_cost"] for i in active_proxy if i["total_cost"] > 0])
             # Knock 15% off the active median to simulate sold reality
            if prices:
                median_active = prices[len(prices) // 2]
                avg_price = round(median_active * 0.85, 2)
                median_price = round(median_active * 0.85, 2)
                
    if not avg_price:
        summary["status"] = "no_data_available"
        return summary

    part.avg_sold_price    = avg_price
    part.median_sold_price = median_price
    part.sample_size       = averages["sample_size"] if averages["sample_size"] > 0 else len(raw_sold)
    part.last_refreshed_at = datetime.now(timezone.utc)
    db.add(part)

    # ── 5. Compute Max Buy Price ──────────────────────────────────────────────
    target_margin = (
        part.target_margin_override
        if part.target_margin_override is not None
        else settings.global_default_margin
    )

    max_buy_price = round(avg_price * (1 - target_margin), 2)
    summary["max_buy_price"] = max_buy_price
    summary["target_margin"] = target_margin

    # ── 6. Fetch Active Listings ──────────────────────────────────────────────
    active_raw = await fetch_active_listings(
        search_query   = part.search_query,
        max_buy_price  = max_buy_price,
        avg_sold_price = avg_price,
        target_margin  = target_margin,
    )
    summary["active_fetched"] = len(active_raw)
    summary["deals_found"] = sum(1 for a in active_raw if a["is_deal"])

    # ── 7. Replace Active Listings (full swap) ────────────────────────────────
    # Delete stale listings for this part, then insert fresh ones
    await db.execute(
        delete(ActiveListing).where(ActiveListing.part_id == part.id)
    )

    for item in active_raw:
        listing = ActiveListing(
            part_id         = part.id,
            ebay_item_id    = item["ebay_item_id"],
            title           = item["title"],
            current_price   = item["current_price"],
            shipping_cost   = item["shipping_cost"],
            total_cost      = item["total_cost"],
            condition       = item["condition"],
            listing_type    = item["listing_type"],
            end_time        = item.get("end_time"),
            listing_url     = item["listing_url"],
            image_url       = item.get("image_url"),
            max_buy_price   = item["max_buy_price"],
            estimated_profit= item["estimated_profit"],
            margin_pct      = item["margin_pct"],
            is_deal         = item["is_deal"],
        )
        db.add(listing)

    await db.flush()

    summary["status"] = "success"
    logger.info("Refresh complete for %s | %s", part.name, summary)
    return summary


async def refresh_all_parts(db: AsyncSession, force: bool = False) -> list[dict]:
    """Called by the scheduler — refreshes every active part.
    
    Args:
        force: If True, refresh regardless of last_refreshed_at (used for manual triggers).
               If False (scheduler), skip parts refreshed within the last 2 hours.
    """
    result = await db.execute(
        select(TrackedPart).where(TrackedPart.is_active == True)
    )
    parts = result.scalars().all()

    now = datetime.now(timezone.utc)
    min_age_hours = 2  # Don't re-refresh within 2 hours to stay under rate limits

    summaries = []
    for part in parts:
        # Skip recently refreshed parts unless forced
        if not force and part.last_refreshed_at:
            age_hours = (now - part.last_refreshed_at).total_seconds() / 3600
            if age_hours < min_age_hours:
                logger.info(
                    "Skipping %s — refreshed %.1fh ago (min %.1fh)",
                    part.name, age_hours, min_age_hours
                )
                summaries.append({"part_id": str(part.id), "status": "skipped_recent"})
                continue

        try:
            summary = await refresh_part(part, db)
            await db.commit()  # Persist this part immediately
            summaries.append(summary)
            # Small stagger between parts to avoid burst rate limits
            await asyncio.sleep(1)
        except Exception as e:
            await db.rollback() # Clear the failed transaction state
            logger.error("Refresh failed for %s: %s", part.name, e)
            summaries.append({"part_id": str(part.id), "status": "error", "error": str(e)})

    return summaries