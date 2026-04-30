from fastapi import APIRouter, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.database import get_db
from app.models.part import TrackedPart
from app.services.discovery_service import (
    discover_trending,
    discover_by_category,
    discover_by_keyword,
    get_trending_categories,
)

router = APIRouter(tags=["Discovery"])


@router.get("/discovery/categories")
async def list_trending_categories():
    """Returns the curated list of trending categories for the frontend picker."""
    return get_trending_categories()


@router.get("/discovery/trending")
async def trending_parts():
    """Discovers top part candidates across all curated categories."""
    return await discover_trending()


@router.get("/discovery/category")
async def parts_by_category(
    id: str = Query(..., description="eBay category ID"),
    name: str = Query(..., max_length=60, description="Human-readable category name"),
):
    """Discovers top part candidates within a specific eBay category."""
    return await discover_by_category(id, name)


@router.get("/discovery/keyword")
async def parts_by_keyword(
    q: str = Query(..., min_length=2, max_length=100, description="Free-form keyword"),
):
    """Discovers part candidates matching a keyword."""
    return await discover_by_keyword(q)


@router.post("/discovery/import/trending")
async def import_trending_parts(db: AsyncSession = Depends(get_db)):
    """
    Discovers trending parts and saves them to the DB.
    Skips duplicates by search_query. Use this to bootstrap the app.
    """
    candidates = await discover_trending()

    inserted = 0
    skipped = 0
    for c in candidates:
        stmt = (
            pg_insert(TrackedPart)
            .values(
                name=c["name"],
                category=c["category"],
                search_query=c["search_query"],
                target_margin_override=c.get("target_margin_override"),
            )
            .on_conflict_do_nothing(index_elements=["search_query"])
        )
        result = await db.execute(stmt)
        if result.rowcount:
            inserted += 1
        else:
            skipped += 1

    await db.commit()
    return {"inserted": inserted, "skipped": skipped, "total_candidates": len(candidates)}
