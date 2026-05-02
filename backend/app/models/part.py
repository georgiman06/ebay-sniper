# TrackedPart — the master registry of what we monitor
import uuid
from sqlalchemy import Column, String, Float, Boolean, DateTime, Text, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class TrackedPart(Base):
    __tablename__ = "tracked_parts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name            = Column(String(255), nullable=False)          # "RTX 3080"
    category        = Column(String(100), nullable=False)          # "GPU", "CPU", "RAM"
    search_query    = Column(Text, nullable=False, unique=True)     # eBay boolean search string
                                                                    # e.g. '(RTX 3080) -"for parts" -broken -faulty'
    is_active       = Column(Boolean, default=True, nullable=False)
    
    # Per-part overrides (NULL → fall back to global settings)
    target_margin_override  = Column(Float, nullable=True)  # e.g. 0.30 = 30%
    ebay_fee_override       = Column(Float, nullable=True)  # e.g. 0.12 for Tools category
    outbound_shipping       = Column(Float, nullable=True)  # estimated cost to ship item out

    # Computed/cached fields — updated each refresh cycle
    avg_sold_price      = Column(Float, nullable=True)             # Rolling 30-day average
    median_sold_price   = Column(Float, nullable=True)             # More robust to outliers
    sample_size         = Column(Integer, nullable=True)           # # of comps used in avg
    last_refreshed_at   = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    sold_listings   = relationship("SoldListing",   back_populates="part", 
                                   cascade="all, delete-orphan")
    active_listings = relationship("ActiveListing", back_populates="part",
                                   cascade="all, delete-orphan")