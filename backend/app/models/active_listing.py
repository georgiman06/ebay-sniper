# ActiveListing — live sniper targets, REPLACED on each refresh (not appended)
import uuid
from sqlalchemy import Column, String, Float, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class ActiveListing(Base):
    __tablename__ = "active_listings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    part_id         = Column(UUID(as_uuid=True), ForeignKey("tracked_parts.id"),
                              nullable=False, index=True)
    
    ebay_item_id    = Column(String(50), nullable=False)
    title           = Column(Text, nullable=False)
    current_price   = Column(Float, nullable=False)
    shipping_cost   = Column(Float, nullable=True)
    total_cost      = Column(Float, nullable=False)
    condition       = Column(String(50), nullable=True)
    listing_type    = Column(String(20), nullable=False)  # "BIN" | "AUCTION"
    end_time        = Column(DateTime(timezone=True), nullable=True)  # for auction urgency
    listing_url     = Column(Text, nullable=False)
    image_url       = Column(Text, nullable=True)
    
    # Margin calculations — computed on ingest, not at query time
    max_buy_price   = Column(Float, nullable=True)   # snapshot of threshold at ingest time
    estimated_profit = Column(Float, nullable=True)  # max_buy_price - total_cost
    margin_pct      = Column(Float, nullable=True)   # (profit / avg_sold) * 100
    is_deal         = Column(Boolean, default=False)  # True if total_cost < max_buy_price
    
    fetched_at      = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    part = relationship("TrackedPart", back_populates="active_listings")