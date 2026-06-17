from fastapi import APIRouter
import aiosqlite
from config import settings

router = APIRouter()


@router.get("/{user_id}")
async def get_decision_logs(user_id: str, limit: int = 20):
    async with aiosqlite.connect(settings.database_url) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            """SELECT log_id, agent, node, intent, tool_called,
                      user_reaction, created_at
               FROM decision_logs
               WHERE user_id = ?
               ORDER BY created_at DESC LIMIT ?""",
            (user_id, limit)
        ) as cursor:
            rows = await cursor.fetchall()
    return [dict(r) for r in rows]
