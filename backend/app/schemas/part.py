from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime

class PartCreate(BaseModel):
    name: str
    category: str
    search_query: str
    target_margin_override: Optional[float] = None

class PartUpdate(BaseModel):
    is_active: Optional[bool] = None
    target_margin_override: Optional[float] = None

class PartResponse(BaseModel):
    id: UUID
    name: str
    category: str
    search_query: str
    is_active: bool
    target_margin_override: Optional[float]
    avg_sold_price: Optional[float]
    median_sold_price: Optional[float]
    sample_size: Optional[int]
    last_refreshed_at: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]
    
    # Enriched fields not in DB
    effective_margin: Optional[float] = None
    max_buy_price: Optional[float] = None

    class Config:
        from_attributes = True
