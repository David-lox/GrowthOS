"""
semantic_memory (L3): 从用户行为提取长期偏好并写入 user_memory 表
"""
import json
from openai import AsyncOpenAI
from config import settings

_client = AsyncOpenAI(
    api_key=settings.dashscope_api_key,
    base_url=settings.dashscope_base_url,
)

EXTRACT_PROMPT = """分析以下用户行为，提取可复用的偏好和规律。
只提取有明确依据的信息，不要猜测。

用户行为记录：
{evidence}

输出 JSON（updates 可以为空数组）：
{{
  "updates": [
    {{
      "memory_type": "preference|style|rule|habit",
      "key": "具体的 key（如 hook_style_preference、reject_music_bg 等）",
      "value": "提取到的值（简洁）",
      "confidence": 0.7,
      "evidence": "支持此判断的原始行为"
    }}
  ]
}}

重点关注：
- 用户拒绝了什么 → 反向推断偏好（confidence: 0.75）
- 用户修改了什么 → 记录修改方向（confidence: 0.8）
- 用户主动说的限制 → 高置信度（confidence: 0.9）
- 用户满意并确认的风格 → 记录风格特征（confidence: 0.85）

只输出 JSON，不要其他内容。"""


async def extract_and_update(user_id: str, evidence: str, db):
    """
    触发时机：
    1. 用户确认内容（accepted）
    2. 用户拒绝建议（rejected）
    3. 用户修改内容（modified）
    4. 归因验证成功（improvement > 10%）
    """
    if not evidence.strip():
        return

    try:
        resp = await _client.chat.completions.create(
            model=settings.model_chat,
            messages=[{
                "role": "user",
                "content": EXTRACT_PROMPT.format(evidence=evidence)
            }],
            max_tokens=600,
        )
        raw = resp.choices[0].message.content.strip()
        if "```json" in raw:
            raw = raw.split("```json")[1].split("```")[0].strip()
        elif "```" in raw:
            raw = raw.split("```")[1].split("```")[0].strip()

        data = json.loads(raw)
        updates = data.get("updates", [])

        for item in updates:
            memory_type = item.get("memory_type", "preference")
            key = item.get("key", "")
            value = item.get("value", "")
            confidence = float(item.get("confidence", 0.7))
            ev = item.get("evidence", "")

            if not key or not value:
                continue

            # UPSERT：新旧置信度加权平均
            await db.execute(
                """INSERT INTO user_memory (user_id, memory_type, key, value, confidence, evidence)
                   VALUES (?, ?, ?, ?, ?, ?)
                   ON CONFLICT(user_id, memory_type, key) DO UPDATE SET
                     value = excluded.value,
                     confidence = MIN(1.0, (confidence * 0.4 + excluded.confidence * 0.6)),
                     evidence = excluded.evidence,
                     last_updated = CURRENT_TIMESTAMP""",
                (user_id, memory_type, key, value, confidence, ev)
            )

        await db.commit()
    except Exception:
        pass  # 记忆提取失败不影响主流程


async def get_rules_summary(user_id: str, db, min_confidence: float = 0.65) -> str:
    """获取高置信度规律，供 orchestrator 注入系统 prompt"""
    async with db.execute(
        """SELECT variable, winner_logic, metric, delta, platform, confidence
           FROM creative_rules
           WHERE user_id = ? AND confidence >= ?
           ORDER BY confidence DESC LIMIT 10""",
        (user_id, min_confidence)
    ) as cursor:
        rows = await cursor.fetchall()

    if not rows:
        return ""

    lines = ["### 已验证的创作规律（请在生成内容时自动应用）"]
    for row in rows:
        variable, winner, metric, delta, platform, conf = row
        lines.append(
            f"- [{platform}] {variable}：{winner}（指标：{metric} +{delta}，置信度：{conf:.0%}）"
        )
    return "\n".join(lines)
