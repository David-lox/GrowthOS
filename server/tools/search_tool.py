"""
search_tool: 使用 DashScope 联网搜索能力
调用一次 LLM（启用 enable_search），返回搜索摘要
"""
import json
from openai import AsyncOpenAI
from config import settings
from tools.registry import register_tool, Tool

_client = AsyncOpenAI(
    api_key=settings.dashscope_api_key,
    base_url=settings.dashscope_base_url,
)

SEARCH_SCHEMA = {
    "type": "object",
    "properties": {
        "query": {
            "type": "string",
            "description": "搜索查询词，越具体越好"
        },
        "purpose": {
            "type": "string",
            "description": "搜索目的，帮助过滤相关结果"
        }
    },
    "required": ["query"]
}


async def run_search(args: dict) -> dict:
    query = args.get("query", "")
    purpose = args.get("purpose", "获取最新信息")

    resp = await _client.chat.completions.create(
        model=settings.model_search,
        messages=[
            {
                "role": "user",
                "content": (
                    f"请帮我搜索：{query}\n"
                    f"目的：{purpose}\n"
                    "请整理搜索结果，输出关键信息摘要，包含来源和时效性判断。"
                )
            }
        ],
        extra_body={"enable_search": True},
        max_tokens=800,
    )

    summary = resp.choices[0].message.content
    return {
        "query": query,
        "summary": summary,
    }


register_tool(Tool(
    name="search",
    description="联网搜索最新信息，适用于查热点、了解平台规则、验证市场需求等场景",
    input_schema=SEARCH_SCHEMA,
    run=run_search,
))
