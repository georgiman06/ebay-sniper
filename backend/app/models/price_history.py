# SoldListing — immutable record of every completed eBay sale we've ingested
import uuid
from sqlalchemy import Column, String, Float, DateTime, Boolean, Text, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class SoldListing(Base):
    __tablename__ = "sold_listings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    part_id         = Column(UUID(as_uuid=True), ForeignKey("tracked_parts.id"), 
                              nullable=False, index=True)
    
    # Raw eBay data — never mutate after insert
    ebay_item_id    = Column(String(50), unique=True, nullable=False)  # dedup key
    title           = Column(Text, nullable=False)
    sold_price      = Column(Float, nullable=False)                    # USD, final sale
    shipping_cost   = Column(Float, nullable=True)                     # NULL = free/unknown
    total_cost      = Column(Float, nullable=False)                    # sold_price + shipping
    condition       = Column(String(50), nullable=True)                # "Used", "Refurbished"
    sold_date       = Column(DateTime(timezone=True), nullable=False, index=True)
    listing_url     = Column(Text, nullable=True)
    
    # Data quality flags (set by data_cleaner.py)
    is_outlier      = Column(Boolean, default=False, nullable=False)   # excluded from avg
    outlier_reason  = Column(String(100), nullable=True)               # "price_too_low", etc.
    is_used_in_avg  = Column(Boolean, default=False, nullable=False)   # clean comps only
    
    ingested_at     = Column(DateTime(timezone=True), server_default=func.now())

    part = relationship("TrackedPart", back_populates="sold_listings")

    # Composite index for the most common query pattern:
    # "Give me all clean sold prices for part X in the last 30 days"
    __table_args__ = (
        Index("ix_sold_part_date_clean", "part_id", "sold_date", "is_used_in_avg"),
    )