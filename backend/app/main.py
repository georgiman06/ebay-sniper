# main.py — remove seed, add search router
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import parts, refresh, listings, health, search  # ← search replaces discover
from app.scheduler import start_scheduler
from app.database import engine, Base
import logging

logger = logging.getLogger(__name__)
app = FastAPI(title="eBay Deal Finder", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(parts.router,    prefix="/api/v1")
app.include_router(refresh.router,  prefix="/api/v1")
app.include_router(listings.router, prefix="/api/v1")
app.include_router(health.router,   prefix="/api/v1")
app.include_router(search.router,   prefix="/api/v1")  # ← new primary flow

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    start_scheduler()
    logger.info("App started — clean slate, no seed data.")

@app.on_event("shutdown")
async def shutdown():
    await engine.dispose()