"""
adapt_agent：多平台内容适配
使用 asyncio.gather 并行生成所有目标平台版本
"""
import json
import asyncio
from openai import AsyncOpenAI
from config import settings
from tools.registry import register_tool, Tool

PLATFORM_RULES = {
    "douyin": {
        "name": "抖音",
        "algo_weights": "完播率40%、关注转化30%、互动率20%、转发10%",
        "key_metric": "完播率",
        "hook_rule": "前3秒必须结论先行，直接给答案，不设悬念",
        "follow_cta": "在视频30%-40%处插入关注引导语",
        "format": "15-60秒竖屏，字幕必须",
        "gold_time": "周二/四/六 晚7-9点",
    },
    "xiaohongshu": {
        "name": "小红书",
        "algo_weights": "CES(关注×8+评论×4+收藏×2+点赞×1)为核心指标",
        "key_metric": "CES综合分",
        "hook_rule": "封面决定点击，标题需包含关键词+数字+情绪词",
        "follow_cta": "正文结尾双引导：关注+评论（评论给数字权重4倍）",
        "format": "图文9张竖图或3:4比例，正文800-1000字",
        "gold_time": "周三/五 午12-13点或晚9-10点",
    },
    "shipinhao": {
        "name": "视频号",
        "algo_weights": "社交关系链60%、完播率20%、互动20%",
        "key_metric": "转发率",
        "hook_rule": "开场说具体使用场景，让观众想到特定人群转发",
        "follow_cta": "结尾设置具体转发场景：'转给你身边xxx的朋友'",
        "format": "1-3分钟横竖屏均可，建议9:16",
        "gold_time": "周四/日 晚8-9点",
    },
    "weixin": {
        "name": "公众号",
        "algo_weights": "打开率50%、阅读完成率30%、分享20%",
        "key_metric": "打开率",
        "hook_rule": "标题决定打开率，需提供5个备选标题",
        "follow_cta": "文末引导评论+分享朋友圈",
        "format": "1000-3000字，配3-5张图，可配合音频",
        "gold_time": "周二/四 早8-9点或晚8-9点",
    },
    "bilibili": {
        "name": "B站",
        "algo_weights": "完播率35%、互动率(弹幕+评论+收藏)40%、播放量25%",
        "key_metric": "完播+硬币投稿",
        "hook_rule": "前15秒说清楚视频能解决什么问题，留悬念到第2分钟",
        "follow_cta": "结尾三连引导（一键三连），分章节提升完播",
        "format": "3-15分钟横屏为主，配字幕章节",
        "gold_time": "周五/六 晚8-10点",
    },
}

ADAPT_SYSTEM = """你是专业的多平台内容适配专家，根据原始内容为指定平台生成差异化版本。

平台算法规则：
{platform_rules}

要求：
1. 严格遵守平台算法权重和钩子规则
2. 调整语言风格适应平台用户群
3. hook 和 CTA 必须针对平台特性定制
4. 输出完整可直接使用的版本

以 JSON 格式返回，不要有任何其他文字：
{
  "platform": "平台名",
  "title": "适配后的标题",
  "hook": "开场钩子（前3秒/前两行）",
  "body": "正文内容（适应平台格式）",
  "cta": "行动引导语",
  "tags": ["标签1", "标签2", "标签3"],
  "coverSuggestion": "封面建议",
  "goldTime": "推荐发布时间（精确到星期+时段）",
  "growthTips": ["推流技巧1", "推流技巧2", "推流技巧3"],
  "publishSchedule": "具体发布计划（精确到日期时间，如：本周四 2026-05-22 20:00）"
}"""


async def _adapt_single(llm: AsyncOpenAI, platform: str, content: dict, topic: str) -> dict:
    """为单个平台生成适配版本"""
    rules = PLATFORM_RULES.get(platform, {})
    rules_text = "\n".join(f"  - {k}: {v}" for k, v in rules.items())

    content_summary = json.dumps(content, ensure_ascii=False, indent=2)[:2000]

    resp = await llm.chat.completions.create(
        model=settings.model_chat,
        messages=[
            {"role": "system", "content": ADAPT_SYSTEM.replace("{platform_rules}", rules_text)},
            {
                "role": "user",
                "content": f"原始内容主题：{topic}\n\n原始内容：\n{content_summary}\n\n"
                           f"请为「{rules.get('name', platform)}」平台生成完整适配版本。"
            }
        ],
        max_tokens=2000,
    )

    raw = resp.choices[0].message.content or ""
    start = raw.find("{")
    end = raw.rfind("}") + 1
    if start >= 0 and end > start:
        try:
            result = json.loads(raw[start:end])
            result["platform"] = platform
            return result
        except json.JSONDecodeError:
            pass

    return {
        "platform": platform,
        "title": topic,
        "hook": "（生成失败，请重试）",
        "body": raw,
        "cta": rules.get("follow_cta", ""),
        "tags": [],
        "goldTime": rules.get("gold_time", ""),
        "growthTips": [],
        "publishSchedule": "",
        "error": "parse_failed",
    }


async def run_adapt_agent(params: dict) -> dict:
    """
    多平台并行适配入口
    params:
      - topic: 选题
      - content: 原始内容（script 或 graphic 结构）
      - platforms: 目标平台列表 ['douyin', 'xiaohongshu', ...]
      - niche: 赛道信息（可选）
    """
    topic = params.get("topic", "")
    content = params.get("content", {})
    platforms = params.get("platforms", ["douyin", "xiaohongshu"])

    if not topic or not content:
        return {"error": "缺少 topic 或 content 参数"}

    llm = AsyncOpenAI(
        api_key=settings.dashscope_api_key,
        base_url=settings.dashscope_base_url,
    )

    # asyncio.gather 并行生成所有平台版本
    tasks = [_adapt_single(llm, p, content, topic) for p in platforms]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    versions = []
    for platform, result in zip(platforms, results):
        if isinstance(result, Exception):
            versions.append({
                "platform": platform,
                "error": str(result),
            })
        else:
            versions.append(result)

    return {
        "topic": topic,
        "versions": versions,
        "platformCount": len(versions),
    }


register_tool(Tool(
    name="adapt_agent",
    description="多平台内容适配，asyncio.gather 并行生成各平台差异化版本（hook/CTA/标签/发布时间/推流技巧）",
    input_schema={
        "type": "object",
        "properties": {
            "topic": {"type": "string", "description": "内容主题/选题"},
            "content": {"type": "object", "description": "原始内容结构（来自 content_agent 输出）"},
            "platforms": {
                "type": "array",
                "items": {"type": "string", "enum": ["douyin", "xiaohongshu", "shipinhao", "weixin", "bilibili"]},
                "description": "目标平台列表"
            },
            "niche": {"type": "string", "description": "账号赛道（可选，用于定制化适配）"},
        },
        "required": ["topic", "content", "platforms"],
    },
    run=run_adapt_agent,
))
