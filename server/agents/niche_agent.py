"""
niche_agent: 赛道分析 Agent
输入：用户背景 + 兴趣方向 + 约束
输出：3条赛道候选（含评分/竞争/变现/选题示例）+ 人设锚点
"""
import json
from openai import AsyncOpenAI
from config import settings
from tools.registry import register_tool, Tool

_client = AsyncOpenAI(
    api_key=settings.dashscope_api_key,
    base_url=settings.dashscope_base_url,
)

NICHE_SCHEMA = {
    "type": "object",
    "properties": {
        "background": {
            "type": "string",
            "description": "用户背景（职业、年龄、生活状态等）"
        },
        "interests": {
            "type": "string",
            "description": "兴趣方向和内容想法"
        },
        "weekly_hours": {
            "type": "integer",
            "description": "每周可用于创作的小时数"
        },
        "monetization": {
            "type": "string",
            "description": "变现目标（带货/接广告/知识付费/涨粉等）"
        },
        "constraints": {
            "type": "string",
            "description": "约束条件（如不愿出镜、住校不方便拍、没设备等）"
        },
        "target_platforms": {
            "type": "string",
            "description": "目标平台（抖音/小红书/视频号/公众号）"
        }
    },
    "required": ["background"]
}

NICHE_SYSTEM = """你是专业的自媒体赛道分析师，专注帮助 KOC 找到适合自己的垂类方向。

你的任务：根据用户信息，输出 3 条赛道候选和人设锚点。

## 评分体系（三维加权）
- 持续生产能力匹配度 40%（兴趣强度 × 时间充裕度 × 内容素材来源）
- 平台竞争密度 30%（竞争越低得分越高，评估标准：头部账号数、增粉难度）
- 变现路径清晰度 30%（路径越具体、转化越直接得分越高）

## 严格要求
1. 赛道必须精确到"垂类×目标人群"粒度，禁止"穿搭""美食"这种泛类
2. 每条赛道给 5 个具体选题示例（不是方向，是可直接拍摄的标题）
3. 内容支柱必须是 3 个月可持续执行的方向
4. 如果用户自己的想法不合适，必须在 warningIfAny 中说明原因

## 输出 JSON 格式（严格遵守）
{
  "recommendations": [
    {
      "niche": "垂类×人群（如：校园穿搭×大学女生）",
      "score": 88,
      "competition": "低|中|高",
      "sustainabilityReason": "可持续生产的原因",
      "monetizationPath": "变现路径描述",
      "differentiator": "差异化竞争优势",
      "contentPillars": ["支柱1", "支柱2", "支柱3"],
      "topicExamples": ["选题1", "选题2", "选题3", "选题4", "选题5"],
      "verdict": "强烈推荐|推荐|备选",
      "reason": "推荐/不推荐理由（50字内）"
    }
  ],
  "persona": {
    "anchor": "人设锚点一句话（如：宿舍里的平价时尚研究员）",
    "tone": "内容基调",
    "targetAudience": "目标受众描述"
  },
  "warningIfAny": null
}
只输出 JSON，不要其他内容。"""


async def run_niche_agent(args: dict) -> dict:
    background = args.get("background", "")
    interests = args.get("interests", "")
    weekly_hours = args.get("weekly_hours", 10)
    monetization = args.get("monetization", "")
    constraints = args.get("constraints", "")
    platforms = args.get("target_platforms", "抖音、小红书")

    user_info = f"""用户背景：{background}
兴趣方向：{interests}
每周可用时间：{weekly_hours}小时
变现目标：{monetization}
约束条件：{constraints}
目标平台：{platforms}"""

    resp = await _client.chat.completions.create(
        model=settings.model_search,
        messages=[
            {"role": "system", "content": NICHE_SYSTEM},
            {"role": "user", "content": user_info}
        ],
        extra_body={"enable_search": True},
    )

    content = resp.choices[0].message.content.strip()
    # 提取 JSON
    if "```json" in content:
        content = content.split("```json")[1].split("```")[0].strip()
    elif "```" in content:
        content = content.split("```")[1].split("```")[0].strip()

    try:
        result = json.loads(content)
    except json.JSONDecodeError:
        result = {"error": "解析赛道分析结果失败", "raw": content}

    return result


register_tool(Tool(
    name="niche_agent",
    description="赛道分析，根据用户背景深度分析，输出3条精准赛道候选（含评分/竞争/变现路径/选题示例）和人设锚点",
    input_schema=NICHE_SCHEMA,
    run=run_niche_agent,
))
