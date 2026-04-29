from fastapi import APIRouter, Query
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
