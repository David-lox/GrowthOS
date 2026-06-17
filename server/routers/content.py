import json
import uuid
from fastapi import APIRouter
from pydantic import BaseModel
import aiosqlite
from datetime import datetime, timezone
from config import settings

router = APIRouter()


class ContentFinalize(BaseModel):
    user_id: str
    session_id: str = None
    topic: str
    niche: str = None
    content_type: str = None
    platform: str = None
    script: dict = None
    cover_image_url: str = None


@router.get("/{user_id}")
async def get_content_list(user_id: str, limit: int = 20):
    async with aiosqlite.connect(settings.database_url) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            """SELECT id, topic, niche, content_type, platform, status, created_at
               FROM content_records WHERE user_id = ?
               ORDER BY created_at DESC LIMIT ?""",
            (user_id, limit)
        ) as cursor:
            rows = await cursor.fetchall()
    return [dict(r) for r in rows]


@router.post("/finalize")
async def finalize_content(body: ContentFinalize):
    content_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    async with aiosqlite.connect(settings.database_url) as db:
        await db.execute(
            """INSERT INTO content_records
               (id, user_id, session_id, topic, niche, content_type, platform,
                script, cover_image_url, status, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,'final',?)""",
            (
                content_id, body.user_id, body.session_id,
                body.topic, body.niche, body.content_type, body.platform,
                json.dumps(body.script, ensure_ascii=False) if body.script else None,
                body.cover_image_url, now,
            )
        )
        await db.commit()
    return {"content_id": content_id}


@router.put("/{content_id}")
async def update_content(content_id: str, body: dict):
    """更新内容字段（EditableText 保存触发）"""
    allowed_fields = {"topic", "script", "cover_image_url", "platform_versions", "status"}
    updates = {k: v for k, v in body.items() if k in allowed_fields}
    if not updates:
        return {"updated": 0}
    set_clauses = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [content_id]
    async with aiosqlite.connect(settings.database_url) as db:
        await db.execute(
            f"UPDATE content_records SET {set_clauses} WHERE id = ?",
            values,
        )
        await db.commit()
    return {"updated": 1}


@router.get("/{content_id}/detail")
async def get_content_detail(content_id: str):
    async with aiosqlite.connect(settings.database_url) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM content_records WHERE id = ?", (content_id,)
        ) as cursor:
            row = await cursor.fetchone()
    if not row:
        return {}
    return dict(row)
