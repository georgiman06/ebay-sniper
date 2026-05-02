"""
ApiUsage — daily counter rows, one per (service, date).

Read-time aggregation gives us both daily and monthly views without
needing two tables. eBay Browse has a daily quota; ScraperAPI has a
monthly quota — we compute the right window per-service when reading.
"""
from datetime import date, datetime
import uuid
from sqlalchemy import Integer, String, Date, DateTime, UniqueConstraint, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.database import Base


class ApiUsage(Base):
    __tablename__ = "api_usage"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    service: Mapped[str] = mapped_column(String(50), nullable=False)
    usage_date: Mapped[date] = mapped_column(Date, nullable=False)
    count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    failed_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        UniqueConstraint("service", "usage_date", name="uq_api_usage_service_date"),
        Index("ix_api_usage_service_date", "service", "usage_date"),
    )
