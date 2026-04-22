"""
SearchHistory — every part the user has ever queried.
This is the fuel for the suggestion engine.
We track search_query, resolved_name, category, and how many
times the user has interacted with this item type.
"""
import uuid
from sqlalchemy import Column, String, Integer, DateTime, Text, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base


class SearchHistory(Base):
    __tablename__ = "search_history"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # What the user actually typed
    raw_query    = Column(Text, nullable=False)
    
    # Resolved/normalized version we send to eBay
    clean_query  = Column(Text, nullable=False, index=True)
    
    # Resolved metadata (filled after first eBay response)
    resolved_name     = Column(String(255), nullable=True)   # "NVIDIA RTX 3080"
    category          = Column(String(100), nullable=True)   # "GPU"
    brand             = Column(String(100), nullable=True)   # "NVIDIA", "Apple"
    price_tier        = Column(String(20),  nullable=True)   # "budget","mid","high","ultra"
    avg_price_at_search = Column(Float,     nullable=True)   # snapshot of avg when searched

    # Engagement signals for ranking suggestions
    search_count = Column(Integer, default=1, nullable=False)  # how many times queried
    was_added    = Column(Integer, default=0, nullable=False)  # 1 if user added to tracker

    first_searched_at = Column(DateTime(timezone=True), server_default=func.now())
    last_searched_at  = Column(DateTime(timezone=True), server_default=func.now(), 
                               onupdate=func.now(), index=True) 