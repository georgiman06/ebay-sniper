from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID

from app.database import get_db
from app.models.part import TrackedPart
from app.models.active_listing import ActiveListing
from app.schemas.part import PartCreate, PartUpdate, PartResponse
from app.config import settings

router = APIRouter(tags=["Parts"])


@router.get("/parts", response_model=list[PartResponse])
async def list_parts(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(TrackedPart).order_by(TrackedPart.created_at.desc())
    )
    parts = result.scalars().all()
    return [await _enrich(p, db) for p in parts]


@router.post("/parts", response_model=PartResponse, status_code=status.HTTP_201_CREATED)
async def create_part(body: PartCreate, db: AsyncSession = Depends(get_db)):
    part = TrackedPart(**body.model_dump())
    db.add(part)
    await db.flush()
    await db.refresh(part)
    return await _enrich(part, db)


@router.patch("/parts/{part_id}", response_model=PartResponse)
async def update_part(
    part_id: UUID,
    body: PartUpdate,
    db: AsyncSession = Depends(get_db),
):
    part = await _get_or_404(part_id, db)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(part, field, value)
    await db.flush()
    await db.refresh(part)
    return await _enrich(part, db)


@router.delete("/parts/{part_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_part(part_id: UUID, db: AsyncSession = Depends(get_db)):
    part = await _get_or_404(part_id, db)
    await db.delete(part)


# ── Helpers ──────────────────────────────────────────────────────────────────

async def _get_or_404(part_id: UUID, db: AsyncSession) -> TrackedPart:
    result = await db.execute(select(TrackedPart).where(TrackedPart.id == part_id))
    part = result.scalar_one_or_none()
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")
    return part


async def _enrich(part: TrackedPart, db: AsyncSession) -> dict:
    """Adds computed fields that aren't stored in DB."""
    effective_margin = (
        part.target_margin_override
        if part.target_margin_override is not None
        else settings.global_default_margin
    )
    max_buy_price = (
        round(part.avg_sold_price * (1 - effective_margin), 2)
        if part.avg_sold_price
        else None
    )

    # Average actual margin across live deals for this part.
    # Only considers listings where is_deal=True so we're showing
    # the real margin being achieved, not near-misses.
    margin_result = await db.execute(
        select(func.avg(ActiveListing.margin_pct)).where(
            ActiveListing.part_id == part.id,
            ActiveListing.is_deal == True,
            ActiveListing.margin_pct.isnot(None),
        )
    )
    raw_avg = margin_result.scalar()
    avg_deal_margin = round(float(raw_avg), 1) if raw_avg is not None else None

    data = {c.name: getattr(part, c.name) for c in part.__table__.columns}
    data["effective_margin"] = effective_margin
    data["max_buy_price"] = max_buy_price
    data["avg_deal_margin"] = avg_deal_margin
    return data