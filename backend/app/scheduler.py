from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from app.database import AsyncSessionLocal
from app.services.refresh_service import refresh_all_parts
import logging

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


async def scheduled_refresh():
    logger.info("Scheduled refresh triggered")
    async with AsyncSessionLocal() as db:
        summaries = await refresh_all_parts(db)
        await db.commit()
    logger.info("Scheduled refresh complete | %d parts processed", len(summaries))


def start_scheduler():
    # 6:00 AM and 6:00 PM Eastern daily
    scheduler.add_job(
        scheduled_refresh,
        CronTrigger(hour="6,18", minute="0", timezone="America/New_York"),
        id="twice_daily_refresh",
        replace_existing=True,
        misfire_grace_time=300,   # 5 min grace if server was briefly down
    )
    scheduler.start()
    logger.info("Scheduler started — jobs: %s", scheduler.get_jobs())