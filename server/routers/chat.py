"""
chat 路由：
POST /api/chat  -> SSE 流式回复
POST /api/logs/reaction -> 用户反馈
"""
import json
import uuid
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional

import aiosqlite
from config import settings
from agents.orchestrator import process

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    user_id: str = "default_user"


class ReactionRequest(BaseModel):
    log_id: str
    reaction: str  # "good" | "bad" | "modified"
    modification: Optional[str] = None
    outcome_content_id: Optional[str] = None


async def event_stream(user_id: str, session_id: str, message: str):
    """将 orchestrator 的 chunks 序列化为 SSE 格式"""
    async with aiosqlite.connect(settings.database_url) as db:
        db.row_factory = aiosqlite.Row
        sent_done = False
        try:
            async for chunk in process(db, user_id, session_id, message):
                data = json.dumps(chunk, ensure_ascii=False)
                yield f"data: {data}\n\n"
                if chunk.get("type") == "done":
                    sent_done = True
        except Exception as e:
            error_chunk = {"type": "error", "message": str(e)}
            yield f"data: {json.dumps(error_chunk)}\n\n"
        finally:
            # 确保每次流结束都发出 done（ask 暂停时 react_loop 提前 return 不会 yield done）
            if not sent_done:
                yield f"data: {json.dumps({'type': 'done'})}\n\n"


@router.post("/chat")
async def chat(req: ChatRequest):
    session_id = req.session_id or str(uuid.uuid4())
    return StreamingResponse(
        event_stream(req.user_id, session_id, req.message),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Session-Id": session_id,
        },
    )


@router.post("/logs/reaction")
async def log_reaction(req: ReactionRequest):
    async with aiosqlite.connect(settings.database_url) as db:
        await db.execute(
            """
            UPDATE decision_logs
            SET user_reaction = ?,
                user_modification = ?,
                outcome_content_id = ?
            WHERE log_id = ?
            """,
            (req.reaction, req.modification, req.outcome_content_id, req.log_id),
        )
        await db.commit()
    return {"ok": True}
