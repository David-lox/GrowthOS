"""
热点抓取：用户手动触发，单次联网搜索写入 trends 表
"""
import re
import aiosqlite
from openai import AsyncOpenAI
from config import settings
from database import DB_PATH


def _parse_heat(heat_raw: str) -> int:
    heat_raw = heat_raw.replace(",", "").strip()
    try:
        if "亿" in heat_raw:
            return int(float(heat_raw.replace("亿", "")) * 100_000_000)
        if "万" in heat_raw:
            return int(float(heat_raw.replace("万", "")) * 10_000)
        if heat_raw.lower().endswith("w"):
            return int(float(heat_raw[:-1]) * 10_000)
        return int(heat_raw)
    except (ValueError, TypeError):
        return 0


async def fetch_all_trends() -> int:
    """联网搜索抖音/小红书/视频号/公众号综合热门话题，写入 trends 表，返回插入条数"""
    client = AsyncOpenAI(
        api_key=settings.dashscope_api_key,
        base_url=settings.dashscope_base_url,
    )

    query = (
        "请实时搜索今日抖音、小红书、视频号、公众号综合热门话题 top20。"
        "只输出编号列表，每行格式：序号. 话题标题 | 热度值（数字，无单位则写0），不要其他说明。"
    )

    resp = await client.chat.completions.create(
        model=settings.model_search,
        messages=[{"role": "user", "content": query}],
        extra_body={"enable_search": True},
        max_tokens=1200,
    )
    content = resp.choices[0].message.content or ""

    count = 0
    async with aiosqlite.connect(DB_PATH) as db:
        # 清除旧数据（保留最近25小时）
        await db.execute(
            "DELETE FROM trends WHERE fetched_at < datetime('now', '-25 hours')"
        )

        for line in content.split("\n"):
            line = line.strip()
            if not line:
                continue
            # 格式: "1. 标题 | 热度值"
            m = re.match(r"^(\d+)[.、\s]+(.+?)[\s\|｜]+([0-9,万亿kKwW.]+)", line)
            if m:
                title = m.group(2).strip()
                heat_score = _parse_heat(m.group(3))
            else:
                # 无热度数字，仅提取标题
                m2 = re.match(r"^(\d+)[.、\s]+(.{4,100})$", line)
                if not m2:
                    continue
                title = m2.group(2).strip()
                if any(kw in title for kw in ["序号", "标题", "热度", "---", "==="]):
                    continue
                heat_score = 0

            await db.execute(
                """INSERT INTO trends (platform, title, heat_score, fetched_at)
                   VALUES (?, ?, ?, datetime('now'))""",
                ("综合", title[:200], heat_score),
            )
            count += 1
            if count >= 20:
                break

        await db.commit()

    return count
