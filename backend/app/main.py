import asyncio
import sentry_sdk
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from pythonjsonlogger import jsonlogger
from app.limiter import limiter
from app.api.v1 import parts, refresh, listings, health, search, discovery
from app.dependencies import verify_api_key
from app.scheduler import start_scheduler
from app.database import engine, Base
from app.config import settings
import logging

def _configure_logging() -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(jsonlogger.JsonFormatter("%(asctime)s %(name)s %(levelname)s %(message)s"))
    root = logging.getLogger()
    root.setLevel(logging.INFO)
    root.handlers = [handler]
    # Silence noisy libs
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("apscheduler").setLevel(logging.WARNING)

_configure_logging()
logger = logging.getLogger(__name__)

if settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        traces_sample_rate=0.2,
        send_default_pii=False,
    )

app = FastAPI(title="eBay Deal Finder", version="0.2.0", dependencies=[Depends(verify_api_key)])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",")],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(parts.router,    prefix="/api/v1")
app.include_router(refresh.router,  prefix="/api/v1")
app.include_router(listings.router, prefix="/api/v1")
app.include_router(health.router,   prefix="/api/v1")
app.include_router(search.router,     prefix="/api/v1")
app.include_router(discovery.router,  prefix="/api/v1")

async def _startup_refresh():
    from datetime import datetime, timezone, timedelta
    from app.services.refresh_service import refresh_all_parts
    from app.database import AsyncSessionLocal
    from app.models.part import TrackedPart
    from sqlalchemy import select
    async with AsyncSessionLocal() as db:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=6)
        result = await db.execute(
            select(TrackedPart).where(
                TrackedPart.is_active == True,
                (TrackedPart.last_refreshed_at == None) | (TrackedPart.last_refreshed_at < cutoff)
            )
        )
        stale = result.scalars().all()
        if stale:
            logger.info("Startup: %d stale parts detected, triggering refresh.", len(stale))
            await refresh_all_parts(db)
            await db.commit()


@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    start_scheduler()
    logger.info("App started.")
    asyncio.create_task(_startup_refresh())

@app.on_event("shutdown")
async def shutdown():
    await engine.dispose()