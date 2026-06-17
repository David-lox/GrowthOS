"""
trends_tool：热点搜索工具
获取当前平台热点话题，为选题策划提供依据
与 search_tool 不同：专门针对内容创作热点，返回结构化热点数据
"""
import json
from openai import AsyncOpenAI
from config import settings
from tools.registry import register_tool, Tool

_client = AsyncOpenAI(
    api_key=settings.dashscope_api_key,
    base_url=settings.dashscope_base_url,
)

TRENDS_SCHEMA = {
    "type": "object",
    "properties": {
        "niche": {
            "type": "string",
            "description": "账号赛道，用于过滤相关热点（如：通勤穿搭×职场女性）"
        },
        "platforms": {
            "type": "array",
            "items": {"type": "string"},
            "description": "目标平台列表（douyin/xiaohongshu/bilibili等）"
        },
        "limit": {
            "type": "integer",
            "description": "返回热点数量（默认10）",
            "default": 10
        }
    },
    "required": ["niche"]
}


async def run_trends_tool(args: dict) -> dict:
    niche = args.get("niche", "")
    platforms = args.get("platforms", ["douyin", "xiaohongshu"])
    limit = args.get("limit", 10)

    platforms_str = "、".join(platforms) if platforms else "抖音、小红书"

    # 使用搜索模型获取热点
    try:
        resp = await _client.chat.completions.create(
            model=settings.model_search,
            messages=[
                {
                    "role": "user",
                    "content": (
                        f"请搜索{platforms_str}平台上，与「{niche}」赛道相关的当前热点话题和热搜词。\n"
                        f"要求：\n"
                        f"1. 返回{limit}个热点，每个包含：话题标题、热度评分(0-100)、适用平台\n"
                        f"2. 只返回近期（一周内）真实热点，不要杜撰\n"
                        f"3. 按热度降序排列\n\n"
                        f"以JSON格式返回：\n"
                        f'[{{"title":"热点标题","heat_score":85,"platform":"平台","topic_angle":"适合创作的角度"}}]'
                    )
                }
            ],
            max_tokens=2000,
        )

        raw = resp.choices[0].message.content or ""
        # 去除thinking标签
        if "<think>" in raw and "</think>" in raw:
            raw = raw.split("</think>")[-1].strip()
        # 提取JSON数组
        if "```json" in raw:
            raw = raw.split("```json")[1].split("```")[0].strip()
        elif "```" in raw:
            raw = raw.split("```")[1].split("```")[0].strip()

        start = raw.find("[")
        end = raw.rfind("]") + 1
        if start >= 0 and end > start:
            trends = json.loads(raw[start:end])
        else:
            trends = []

        return {
            "trends": trends[:limit],
            "niche": niche,
            "platforms": platforms,
            "count": len(trends[:limit]),
        }

    except Exception as e:
        return {
            "trends": [],
            "niche": niche,
            "error": str(e),
        }


register_tool(Tool(
    name="trends_tool",
    description="获取当前平台热点话题，为选题策划提供依据。返回与赛道相关的热搜词和话题。",
    input_schema=TRENDS_SCHEMA,
    run=run_trends_tool,
))
