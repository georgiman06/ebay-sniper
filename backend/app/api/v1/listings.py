from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.database import get_db
from app.models.active_listing import ActiveListing
from app.models.price_history import SoldListing

router = APIRouter(tags=["Listings"])


@router.get("/sniper")
async def get_sniper_deals(
    part_id: UUID | None = Query(None),
    deals_only: bool = Query(True),
    db: AsyncSession = Depends(get_db),
):
    """
    The Sniper Dashboard feed.
    Returns active listings sorted by margin (best deals first).
    """
    query = select(ActiveListing)
    
    if part_id:
        query = query.where(ActiveListing.part_id == part_id)
    if deals_only:
        query = query.where(ActiveListing.is_deal == True)

    query = query.order_by(ActiveListing.margin_pct.desc())
    
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/history/{part_id}")
async def get_price_history(
    part_id: UUID,
    clean_only: bool = Query(True),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns price history for the chart + forecasting module.
    clean_only=True returns only comps used in the average.
    """
    query = (
        select(SoldListing)
        .where(SoldListing.part_id == part_id)
        .order_by(SoldListing.sold_date.asc())
    )
    if clean_only:
        query = query.where(SoldListing.is_used_in_avg == True)

    result = await db.execute(query)
    return result.scalars().all()