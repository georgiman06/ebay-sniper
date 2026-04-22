from datetime import datetime
import uuid
from sqlalchemy import String, Float, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

class ScrapedSoldListing(Base):
    """
    Cache table to store raw scraped results from Playwright.
    This protects us from scraping the exact same query multiple times in 24h.
    """
    __tablename__ = "scraped_sold_listings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    search_query: Mapped[str] = mapped_column(String, index=True, nullable=False)
    scraped_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    
    # Raw listing data
    ebay_item_id: Mapped[str | None] = mapped_column(String, nullable=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    sold_price: Mapped[float] = mapped_column(Float, nullable=False)
    shipping_cost: Mapped[float] = mapped_column(Float, default=0.0)
    total_cost: Mapped[float] = mapped_column(Float, nullable=False)
    condition: Mapped[str] = mapped_column(String, nullable=False)
    sold_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    listing_url: Mapped[str | None] = mapped_column(String, nullable=True)
