from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime

from typing import Any

class PartCreate(BaseModel):
    name: str
    category: str
    search_query: str
    target_margin_override: Optional[float] = None
    ebay_fee_override: Optional[float] = None
    outbound_shipping: Optional[float] = None

class PartUpdate(BaseModel):
    is_active: Optional[bool] = None
    target_margin_override: Optional[float] = None
    ebay_fee_override: Optional[float] = None
    outbound_shipping: Optional[float] = None

class PartResponse(BaseModel):
    id: UUID
    name: str
    category: str
    search_query: str
    is_active: bool
    target_margin_override: Optional[float]
    ebay_fee_override: Optional[float] = None
    outbound_shipping: Optional[float] = None
    avg_sold_price: Optional[float]
    median_sold_price: Optional[float]
    sample_size: Optional[int]
    last_refreshed_at: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]

    # Enriched fields (computed, not stored)
    effective_margin: Optional[float] = None
    effective_fee: Optional[float] = None
    effective_shipping: Optional[float] = None
    max_buy_price: Optional[float] = None
    fee_breakdown: Optional[Any] = None
    avg_deal_margin: Optional[float] = None

    class Config:
        from_attributes = True
