"""
通知路由：
GET  /api/notifications/pending    - 未读通知列表
PUT  /api/notifications/{id}/shown - 标记已读
"""
from fastapi import APIRouter
import aiosqlite
import json
from database import DB_PATH

router = APIRouter()


@router.get("/pending")
async def get_pending_notifications(user_id: str, limit: int = 20):
    """获取用户未读通知"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            """SELECT id, user_id, type, payload, status, scheduled_for, created_at
               FROM notifications
               WHERE user_id = ? AND status = 'pending'
               ORDER BY created_at DESC LIMIT ?""",
            (user_id, limit)
        ) as cursor:
            rows = await cursor.fetchall()

    result = []
    for row in rows:
        item = dict(row)
        # 安全解析 payload JSON
        try:
            item["payload"] = json.loads(item["payload"]) if item["payload"] else {}
        except (json.JSONDecodeError, TypeError):
            item["payload"] = {}
        result.append(item)

    return result


@router.get("/count")
async def get_notification_count(user_id: str):
    """获取未读通知数量（用于角标）"""
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT COUNT(*) FROM notifications WHERE user_id = ? AND status = 'pending'",
            (user_id,)
        ) as cursor:
            row = await cursor.fetchone()
    return {"count": row[0] if row else 0}


@router.put("/{notification_id}/shown")
async def mark_shown(notification_id: int):
    """标记通知为已读"""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE notifications SET status = 'shown' WHERE id = ?",
            (notification_id,)
        )
        await db.commit()
    return {"ok": True}
