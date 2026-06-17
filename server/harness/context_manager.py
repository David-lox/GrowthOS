"""
ContextManager: 三层上下文压缩管理
L1 = 当前 session 最近对话（保留完整）
L2 = 历史 session 摘要（情节记忆）
L3 = 持久语义记忆（用户特征）
"""
import json
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    import aiosqlite

MAX_L1_TURNS = 20  # 每轮 = 1 user + 1 assistant


async def get_l1_context(db: "aiosqlite.Connection", session_id: str) -> list[dict]:
    """获取当前 session 最近 N 轮对话（完整文本）"""
    async with db.execute(
        """
        SELECT role, content FROM conversations
        WHERE session_id = ?
        ORDER BY created_at ASC
        """,
        (session_id,),
    ) as cursor:
        rows = await cursor.fetchall()

    messages = [{"role": row[0], "content": row[1]} for row in rows]
    # 只保留最近 MAX_L1_TURNS * 2 条
    max_msgs = MAX_L1_TURNS * 2
    if len(messages) > max_msgs:
        messages = messages[-max_msgs:]
    return messages


async def get_l2_summaries(db: "aiosqlite.Connection", user_id: str, limit: int = 3) -> str:
    """获取最近几个历史 session 摘要"""
    async with db.execute(
        """
        SELECT summary, key_decisions FROM episodic_memory
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
        """,
        (user_id, limit),
    ) as cursor:
        rows = await cursor.fetchall()

    if not rows:
        return ""

    parts = ["### 历史会话摘要"]
    for row in rows:
        parts.append(f"- {row[0]}")
        if row[1]:
            parts.append(f"  决策: {row[1]}")
    return "\n".join(parts)


async def get_l3_semantic_memory(db: "aiosqlite.Connection", user_id: str) -> str:
    """获取用户语义记忆（特征/规律/偏好）"""
    async with db.execute(
        """
        SELECT memory_type, key, value FROM user_memory
        WHERE user_id = ?
        ORDER BY memory_type, last_updated DESC
        """,
        (user_id,),
    ) as cursor:
        rows = await cursor.fetchall()

    if not rows:
        return ""

    grouped: dict[str, list[str]] = {}
    for row in rows:
        mtype, key, value = row[0], row[1], row[2]
        if mtype not in grouped:
            grouped[mtype] = []
        grouped[mtype].append(f"  - {key}: {value}")

    parts = ["### 用户特征记忆"]
    for mtype, items in grouped.items():
        parts.append(f"**{mtype}**:")
        parts.extend(items)
    return "\n".join(parts)


async def build_system_context(
    db: "aiosqlite.Connection",
    user_id: str,
    session_id: str,
    base_system_prompt: str,
) -> str:
    """合并 base prompt + L2 + L3 成完整 system prompt"""
    l2 = await get_l2_summaries(db, user_id)
    l3 = await get_l3_semantic_memory(db, user_id)

    extras = "\n\n".join(filter(None, [l3, l2]))
    if extras:
        return f"{base_system_prompt}\n\n{extras}"
    return base_system_prompt


async def save_message(
    db: "aiosqlite.Connection",
    user_id: str,
    session_id: str,
    role: str,
    content: str,
    metadata: dict = None,
):
    await db.execute(
        """
        INSERT INTO conversations (user_id, session_id, role, content, metadata)
        VALUES (?, ?, ?, ?, ?)
        """,
        (user_id, session_id, role, content, json.dumps(metadata) if metadata else None),
    )
    await db.commit()
