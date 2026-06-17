"""
conversations 路由：
GET /api/conversations/{user_id}               -> 会话列表（按 session_id 分组）
GET /api/conversations/session/{session_id}/messages -> 获取指定会话的消息列表
"""
from fastapi import APIRouter
import aiosqlite
from config import settings

router = APIRouter()


@router.get("/session/{session_id}/messages")
async def get_session_messages(session_id: str):
    """获取指定会话的所有消息，用于前端切换历史对话时恢复记录"""
    async with aiosqlite.connect(settings.database_url) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            """
            SELECT role, content FROM conversations
            WHERE session_id = ?
            ORDER BY created_at ASC
            """,
            (session_id,),
        ) as cursor:
            rows = await cursor.fetchall()
    return [{"role": r["role"], "content": r["content"]} for r in rows]


@router.get("/{user_id}")
async def list_conversations(user_id: str, limit: int = 30):
    """
    按 session_id 分组，每组取：
    - session_id
    - 第一条用户消息的前30字作为标题
    - 最后一条消息的时间
    - 消息总数
    """
    async with aiosqlite.connect(settings.database_url) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            """
            SELECT
                session_id,
                (SELECT content FROM conversations
                 WHERE session_id = m.session_id AND user_id = ? AND role = 'user'
                 ORDER BY created_at ASC LIMIT 1) AS title_raw,
                MAX(created_at) AS last_at,
                COUNT(*) AS msg_count
            FROM conversations m
            WHERE user_id = ?
            GROUP BY session_id
            ORDER BY last_at DESC
            LIMIT ?
            """,
            (user_id, user_id, limit),
        ) as cursor:
            rows = await cursor.fetchall()

    result = []
    for r in rows:
        raw = r["title_raw"] or ""
        title = raw[:30] + ("…" if len(raw) > 30 else "")
        result.append({
            "session_id": r["session_id"],
            "title": title or "新对话",
            "last_at": r["last_at"],
            "msg_count": r["msg_count"],
        })
    return result
