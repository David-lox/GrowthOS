from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from database import init_db
from routers import chat, profile, content, data, calendar, trends, image, logs
from routers import health, notifications, conversations

scheduler = AsyncIOScheduler(timezone="Asia/Shanghai")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    # 复盘提醒：每小时检查
    from scheduler.notification_scheduler import check_review_reminders, check_gap_warnings
    scheduler.add_job(check_review_reminders, "interval", hours=1, id="review_reminders")
    # 断更预警：每天 09:00
    scheduler.add_job(check_gap_warnings, "cron", hour=9, minute=0, id="gap_warnings")
    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(title="GrowthOS API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/api")
app.include_router(profile.router, prefix="/api/profile")
app.include_router(content.router, prefix="/api/content")
app.include_router(data.router, prefix="/api/data")
app.include_router(calendar.router, prefix="/api/calendar")
app.include_router(trends.router, prefix="/api/trends")
app.include_router(image.router, prefix="/api/image")
app.include_router(logs.router, prefix="/api/logs")
app.include_router(health.router, prefix="/api/health")
app.include_router(notifications.router, prefix="/api/notifications")
app.include_router(conversations.router, prefix="/api/conversations")


@app.get("/health")
async def health():
    return {"status": "ok"}
