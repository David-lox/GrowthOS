"""
episodic_memory (L2): 会话结束后异步生成摘要
"""
import json
from openai import AsyncOpenAI
from config import settings

_client = AsyncOpenAI(
    api_key=settings.dashscope_api_key,
    base_url=settings.dashscope_base_url,
)

EPISODE_PROMPT = """分析以下对话，生成结构化会话摘要。
重点保留：赛道确认、选题选择、内容确认、拒绝的内容、重要决策。

对话记录：
{conversation}

输出 JSON：
{{
  "summary": "3-5句话总结本次会话的主要内容和成果",
  "key_decisions": "关键决策列表（逗号分隔，如：选定赛道X，确认视频类型Y）"
}}
只输出 JSON。"""


async def save_episode(session_id: str, user_id: str, db):
    """会话结束时异步调用（不阻塞主流程）"""
    async with db.execute(
        """SELECT role, content FROM conversations
           WHERE session_id = ? ORDER BY created_at ASC""",
        (session_id,)
    ) as cursor:
        rows = await cursor.fetchall()

    if len(rows) < 4:  # 太短的对话不值得摘要
        return

    conversation_text = "\n".join(
        f"{row[0]}: {row[1]}" for row in rows
    )
    # 截断过长的对话
    if len(conversation_text) > 4000:
        conversation_text = conversation_text[-4000:]

    try:
        resp = await _client.chat.completions.create(
            model=settings.model_chat,
            messages=[{
                "role": "user",
                "content": EPISODE_PROMPT.format(conversation=conversation_text)
            }],
            max_tokens=400,
        )
        raw = resp.choices[0].message.content.strip()
        if "```json" in raw:
            raw = raw.split("```json")[1].split("```")[0].strip()
        elif "```" in raw:
            raw = raw.split("```")[1].split("```")[0].strip()

        data = json.loads(raw)
        summary = data.get("summary", "")
        key_decisions = data.get("key_decisions", "")

        await db.execute(
            """INSERT INTO episodic_memory (user_id, session_id, summary, key_decisions)
               VALUES (?, ?, ?, ?)""",
            (user_id, session_id, summary, key_decisions)
        )
        await db.commit()
    except Exception:
        pass  # 摘要失败不影响主流程
