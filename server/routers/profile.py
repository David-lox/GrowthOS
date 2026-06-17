from fastapi import APIRouter
from pydantic import BaseModel
import aiosqlite
from datetime import datetime, timezone
from config import settings

router = APIRouter()


class ProfileUpdate(BaseModel):
    niche: str = None
    persona: str = None
    content_type: str = None
    video_subtype: str = None
    platforms: str = None
    weekly_hours: int = None
    monetization: str = None
    background: str = None


@router.get("/{user_id}")
async def get_profile(user_id: str):
    async with aiosqlite.connect(settings.database_url) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM profiles WHERE user_id = ?", (user_id,)
        ) as cursor:
            row = await cursor.fetchone()
    if not row:
        return {}
    return dict(row)


@router.put("/{user_id}")
async def upsert_profile(user_id: str, body: ProfileUpdate):
    now = datetime.now(timezone.utc).isoformat()
    async with aiosqlite.connect(settings.database_url) as db:
        await db.execute(
            """INSERT INTO profiles (user_id, niche, persona, content_type, video_subtype,
                   platforms, weekly_hours, monetization, background, created_at, updated_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?)
               ON CONFLICT(user_id) DO UPDATE SET
                 niche = COALESCE(excluded.niche, niche),
                 persona = COALESCE(excluded.persona, persona),
                 content_type = COALESCE(excluded.content_type, content_type),
                 video_subtype = COALESCE(excluded.video_subtype, video_subtype),
                 platforms = COALESCE(excluded.platforms, platforms),
                 weekly_hours = COALESCE(excluded.weekly_hours, weekly_hours),
                 monetization = COALESCE(excluded.monetization, monetization),
                 background = COALESCE(excluded.background, background),
                 updated_at = excluded.updated_at""",
            (
                user_id, body.niche, body.persona, body.content_type,
                body.video_subtype, body.platforms, body.weekly_hours,
                body.monetization, body.background, now, now,
            )
        )
        await db.commit()
    return {"ok": True}
