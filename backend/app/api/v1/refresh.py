from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from uuid import UUID

from app.database import get_db, AsyncSessionLocal
from app.models.part import TrackedPart
from app.models.sold_listing import ScrapedSoldListing
from app.services.refresh_service import refresh_part, refresh_all_parts

router = APIRouter(tags=["Refresh"])


@router.post("/refresh/all")
async def force_refresh_all(background_tasks: BackgroundTasks):
    """Force refresh every active part — same background pattern."""
    background_tasks.add_task(_run_refresh_all_in_new_session)
    return {"status": "full_refresh_queued"}


@router.post("/refresh/{part_id}")
async def force_refresh_part(
    part_id: UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """
    Manual trigger for a single part. Runs in background so the
    UI gets an immediate 202 Accepted — not a 30-second hang.
    """
    result = await db.execute(select(TrackedPart).where(TrackedPart.id == part_id))
    part = result.scalar_one_or_none()
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")

    background_tasks.add_task(_run_refresh_in_new_session, str(part_id))

    return {"status": "refresh_queued", "part_id": str(part_id)}


async def _run_refresh_in_new_session(part_id: str):
    """Background task needs its own DB session (FastAPI closes the request session)."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(TrackedPart).where(TrackedPart.id == part_id)
        )
        part = result.scalar_one_or_none()
        if part:
            await refresh_part(part, db)
            await db.commit()


async def _run_refresh_all_in_new_session():
    async with AsyncSessionLocal() as db:
        await refresh_all_parts(db)
        await db.commit()


@router.delete("/refresh/cache")
async def clear_scraper_cache(db: AsyncSession = Depends(get_db)):
    """
    Purges all Playwright scraper cache rows so the next refresh re-scrapes
    eBay with the corrected URL params (US locale, USD currency).

    Call this once after deploying the locale/currency scraper fix to
    immediately discard any bad-currency cached data rather than waiting
    for the 24h TTL to expire.
    """
    result = await db.execute(delete(ScrapedSoldListing))
    deleted = result.rowcount
    await db.commit()
    return {"status": "cache_cleared", "rows_deleted": deleted}