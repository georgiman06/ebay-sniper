"""
Quota Tracker
-------------
Tracks every external API call we make so we always know exactly where we
stand without hitting the upstream dashboard.

Design:
- One row in `api_usage` per (service, day). Daily counters; monthly
  windows are summed at read time.
- `reserve()` is the call site wrapper: atomically checks the limit and
  bumps the counter in one round-trip. Returns False if the call should
  be blocked, True otherwise.
- `record_failure()` increments the failed counter for visibility.
- `get_status()` returns the dashboard payload — used by /health/quota.

Limits live here (not in env vars) because changing a quota is a
deliberate code change, not a config tweak. The eBay Production Browse
API quota is 5,000/day for the search endpoint; ScraperAPI's free tier
is 1,000/month. Bump these constants if you upgrade your plan.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Literal

from sqlalchemy import select, func
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models.api_usage import ApiUsage

logger = logging.getLogger(__name__)


# ─── Service catalogue ────────────────────────────────────────────────────────
# `window`: "daily" → reset at 00:00 UTC; "monthly" → reset at month-start UTC.
# `limit`:  hard ceiling. When `count >= limit`, calls are refused.
# `label`:  user-facing name shown in the UI.

@dataclass(frozen=True)
class ServiceSpec:
    key: str
    label: str
    window: Literal["daily", "monthly"]
    limit: int


SERVICES: dict[str, ServiceSpec] = {
    "ebay_browse": ServiceSpec(
        key="ebay_browse", label="eBay Browse", window="daily", limit=5000
    ),
    "ebay_auth": ServiceSpec(
        key="ebay_auth", label="eBay OAuth", window="daily", limit=1000
    ),
    "scraperapi": ServiceSpec(
        key="scraperapi", label="ScraperAPI", window="monthly", limit=1000
    ),
}


# ─── Tier thresholds (used by both backend gating and UI colours) ─────────────
TIER_GREEN = 0.70
TIER_YELLOW = 0.90


def _tier_for(pct: float) -> Literal["green", "yellow", "red", "exhausted"]:
    if pct >= 1.0:
        return "exhausted"
    if pct >= TIER_YELLOW:
        return "red"
    if pct >= TIER_GREEN:
        return "yellow"
    return "green"


def _today_utc() -> date:
    return datetime.now(timezone.utc).date()


def _window_start(spec: ServiceSpec, today: date) -> date:
    if spec.window == "monthly":
        return today.replace(day=1)
    return today


def _window_end_unix(spec: ServiceSpec, today: date) -> int:
    """When does the current window end? Unix timestamp for retry-after hints."""
    if spec.window == "monthly":
        # First day of next month, 00:00 UTC
        if today.month == 12:
            nxt = date(today.year + 1, 1, 1)
        else:
            nxt = date(today.year, today.month + 1, 1)
    else:
        nxt = today + timedelta(days=1)
    return int(datetime(nxt.year, nxt.month, nxt.day, tzinfo=timezone.utc).timestamp())


# ─── Read helpers ─────────────────────────────────────────────────────────────

async def _used_in_window(
    db: AsyncSession, spec: ServiceSpec, today: date
) -> tuple[int, int]:
    """Returns (count, failed_count) summed across the active window."""
    start = _window_start(spec, today)
    result = await db.execute(
        select(
            func.coalesce(func.sum(ApiUsage.count), 0),
            func.coalesce(func.sum(ApiUsage.failed_count), 0),
        ).where(
            ApiUsage.service == spec.key,
            ApiUsage.usage_date >= start,
            ApiUsage.usage_date <= today,
        )
    )
    row = result.one()
    return int(row[0] or 0), int(row[1] or 0)


# ─── Public API ───────────────────────────────────────────────────────────────

async def reserve(service: str) -> bool:
    """
    Atomically reserves one call against the quota. Returns True if the call
    is allowed (counter incremented), False if it would exceed the limit.

    Uses its own short-lived session so quota state isn't tangled with the
    caller's request transaction.
    """
    spec = SERVICES.get(service)
    if not spec:
        logger.warning("reserve() called with unknown service: %s", service)
        return True  # fail-open: don't block on a typo

    today = _today_utc()
    async with AsyncSessionLocal() as db:
        used, _ = await _used_in_window(db, spec, today)
        if used >= spec.limit:
            logger.warning(
                "Quota exhausted for %s | used=%d limit=%d", spec.key, used, spec.limit
            )
            return False

        # Upsert today's row, +1 to count.
        stmt = pg_insert(ApiUsage).values(
            service=spec.key, usage_date=today, count=1, failed_count=0,
        )
        stmt = stmt.on_conflict_do_update(
            constraint="uq_api_usage_service_date",
            set_={"count": ApiUsage.count + 1, "updated_at": func.now()},
        )
        await db.execute(stmt)
        await db.commit()
    return True


async def record_failure(service: str) -> None:
    """Bumps the failed counter for visibility. Never blocks."""
    spec = SERVICES.get(service)
    if not spec:
        return
    today = _today_utc()
    async with AsyncSessionLocal() as db:
        stmt = pg_insert(ApiUsage).values(
            service=spec.key, usage_date=today, count=0, failed_count=1,
        )
        stmt = stmt.on_conflict_do_update(
            constraint="uq_api_usage_service_date",
            set_={"failed_count": ApiUsage.failed_count + 1, "updated_at": func.now()},
        )
        await db.execute(stmt)
        await db.commit()


async def get_status() -> dict:
    """Snapshot of every service. Drives the quota dashboard + nav pill."""
    today = _today_utc()
    services_payload: dict[str, dict] = {}
    async with AsyncSessionLocal() as db:
        for spec in SERVICES.values():
            used, failed = await _used_in_window(db, spec, today)
            pct = used / spec.limit if spec.limit else 0.0
            services_payload[spec.key] = {
                "key": spec.key,
                "label": spec.label,
                "window": spec.window,
                "used": used,
                "failed": failed,
                "limit": spec.limit,
                "pct": round(pct, 4),
                "tier": _tier_for(pct),
                "resets_at_unix": _window_end_unix(spec, today),
            }

    # Aggregate top-line numbers for the metric cards.
    total_used_today = sum(
        s["used"] for s in services_payload.values() if s["window"] == "daily"
    )
    total_failed = sum(s["failed"] for s in services_payload.values())
    worst_tier = max(
        (s["tier"] for s in services_payload.values()),
        key=lambda t: ["green", "yellow", "red", "exhausted"].index(t),
        default="green",
    )

    return {
        "generated_at_unix": int(datetime.now(timezone.utc).timestamp()),
        "overall_tier": worst_tier,
        "totals": {
            "calls_today": total_used_today,
            "failed": total_failed,
        },
        "services": services_payload,
    }


class QuotaExceededError(Exception):
    """Raised by call-site wrappers when reserve() returns False."""

    def __init__(self, service: str):
        self.service = service
        spec = SERVICES.get(service)
        self.label = spec.label if spec else service
        self.window = spec.window if spec else "daily"
        super().__init__(f"Quota exhausted for {self.label}")
