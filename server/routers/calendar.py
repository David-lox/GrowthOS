"""
日历路由：GET/POST 内容日历
"""
import uuid
import json
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from database import get_db

router = APIRouter()


class CalendarItemCreate(BaseModel):
    user_id: str
    topic: str
    platform: str
    scheduled_time: str   # ISO datetime string
    improvement_note: str | None = None
    content_id: str | None = None


@router.get("/{user_id}")
async def get_calendar(user_id: str, db=Depends(get_db)):
    """获取用户内容日历"""
    async with db.execute(
        """SELECT id, topic, platform, scheduled_time, improvement_note,
                  status, reminder_sent, content_id, created_at
           FROM calendar
           WHERE user_id = ?
           ORDER BY scheduled_time ASC""",
        (user_id,)
    ) as cursor:
        rows = await cursor.fetchall()
    keys = ["id", "topic", "platform", "scheduled_time", "improvement_note",
            "status", "reminder_sent", "content_id", "created_at"]
    return [dict(zip(keys, row)) for row in rows]


@router.post("/{user_id}")
async def save_calendar_plan(user_id: str, items: list[CalendarItemCreate], db=Depends(get_db)):
    """
    批量保存日历计划（来自 calendar_agent 输出）
    """
    created_ids = []
    for item in items:
        item_id = str(uuid.uuid4())
        await db.execute(
            """INSERT INTO calendar
               (id, user_id, topic, platform, scheduled_time, improvement_note,
                status, content_id)
               VALUES (?,?,?,?,?,?,?,?)""",
            (
                item_id, user_id, item.topic, item.platform,
                item.scheduled_time, item.improvement_note,
                "planned", item.content_id,
            )
        )
        created_ids.append(item_id)

    await db.commit()
    return {"created": len(created_ids), "ids": created_ids}


@router.patch("/{item_id}/status")
async def update_calendar_status(item_id: str, body: dict, db=Depends(get_db)):
    """更新日历项状态（planned → published）"""
    status = body.get("status", "published")
    await db.execute(
        "UPDATE calendar SET status = ? WHERE id = ?",
        (status, item_id)
    )
    await db.commit()
    return {"ok": True}
