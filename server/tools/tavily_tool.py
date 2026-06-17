"""
tavily_tool: 使用 Tavily API 进行深度网络搜索
适合需要真实网络数据的场景：热点验证、竞品分析、平台规则查询等
"""
import httpx
from config import settings
from tools.registry import register_tool, Tool

TAVILY_API_URL = "https://api.tavily.com/search"

TAVILY_SCHEMA = {
    "type": "object",
    "properties": {
        "query": {
            "type": "string",
            "description": "搜索查询词，越具体越好"
        },
        "search_depth": {
            "type": "string",
            "enum": ["basic", "advanced"],
            "description": "搜索深度：basic 快速，advanced 更全面（默认 basic）"
        },
        "max_results": {
            "type": "integer",
            "description": "返回结果数量（默认 5，最多 10）"
        }
    },
    "required": ["query"]
}


async def run_tavily_search(args: dict) -> dict:
    query = args.get("query", "")
    search_depth = args.get("search_depth", "basic")
    max_results = min(args.get("max_results", 5), 10)

    if not settings.tavily_api_key:
        return {"error": "Tavily API key 未配置，请在 .env 中设置 TAVILY_API_KEY"}

    payload = {
        "api_key": settings.tavily_api_key,
        "query": query,
        "search_depth": search_depth,
        "max_results": max_results,
        "include_answer": True,
        "include_raw_content": False,
    }

    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(TAVILY_API_URL, json=payload)
        resp.raise_for_status()
        data = resp.json()

    results = []
    for r in data.get("results", [])[:max_results]:
        results.append({
            "title": r.get("title", ""),
            "url": r.get("url", ""),
            "content": r.get("content", "")[:600],
            "score": r.get("score", 0),
        })

    return {
        "query": query,
        "answer": data.get("answer", ""),
        "results": results,
    }


register_tool(Tool(
    name="tavily_search",
    description="使用 Tavily 进行深度网络实时搜索，获取最新互联网信息。适合验证热点真实性、查竞品分析、了解平台最新规则、搜索行业数据等场景。比 DashScope 搜索更精准、来源更可靠。",
    input_schema=TAVILY_SCHEMA,
    run=run_tavily_search,
))
