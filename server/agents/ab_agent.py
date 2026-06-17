"""
ab_agent：A/B 测试方案生成
对同一内容生成2-3个差异化版本供测试比较
主要差异维度：Hook / 封面文案 / 标题
"""
import json
from openai import AsyncOpenAI
from config import settings
from tools.registry import register_tool, Tool

_client = AsyncOpenAI(
    api_key=settings.dashscope_api_key,
    base_url=settings.dashscope_base_url,
)

AB_SCHEMA = {
    "type": "object",
    "properties": {
        "content": {
            "type": "object",
            "description": "原始内容（来自content_agent的输出）"
        },
        "topic": {
            "type": "string",
            "description": "内容选题"
        },
        "niche": {
            "type": "string",
            "description": "账号赛道"
        },
        "test_dimensions": {
            "type": "array",
            "items": {"type": "string"},
            "description": "测试维度列表（hook/cover_title/opening_style）"
        },
        "variants_count": {
            "type": "integer",
            "description": "生成变体数量（默认2）",
            "default": 2
        }
    },
    "required": ["topic", "niche"]
}

AB_SYSTEM = """你是专业的内容A/B测试专家，擅长为同一选题生成差异化版本用于测试。

任务：基于原始内容，生成{variants_count}个差异化变体，用于A/B测试哪种表达效果更好。

## 变体差异维度
- hook: 前3秒/首句开场方式（结论先行 vs 悬念制造 vs 痛点共鸣 vs 数据冲击）
- cover_title: 封面标题（信息差型 vs 情绪共鸣型 vs 数字型 vs 问句型）
- opening_style: 整体开场风格（直给型 vs 故事型 vs 对话型）

## 输出格式（严格JSON）
{
  "variants": [
    {
      "id": "A",
      "dimension": "测试的差异维度",
      "hook": "开场钩子（前3秒完整台词）",
      "cover_title": "封面主标题",
      "opening_style": "开场风格描述",
      "rationale": "为什么这个版本可能更好（30字内）",
      "predicted_advantage": "预期优势（完播率/点击率/互动率）"
    }
  ],
  "test_hypothesis": "本次A/B测试的核心假设",
  "measurement_metric": "建议用哪个指标判断胜出（完播率/点赞率/评论率）",
  "test_duration": "建议测试时长（如：发布后24小时对比）"
}
只输出JSON，不要其他内容。"""


async def run_ab_agent(args: dict) -> dict:
    topic = args.get("topic", "")
    niche = args.get("niche", "")
    content = args.get("content", {})
    test_dimensions = args.get("test_dimensions", ["hook", "cover_title"])
    variants_count = args.get("variants_count", 2)

    content_summary = json.dumps(content, ensure_ascii=False)[:1000] if content else "（无原始内容，请基于选题生成）"

    system = AB_SYSTEM.replace("{variants_count}", str(variants_count))

    resp = await _client.chat.completions.create(
        model=settings.model_chat,
        messages=[
            {"role": "system", "content": system},
            {
                "role": "user",
                "content": (
                    f"选题：{topic}\n"
                    f"赛道：{niche}\n"
                    f"测试维度：{', '.join(test_dimensions)}\n"
                    f"变体数量：{variants_count}\n\n"
                    f"原始内容参考：\n{content_summary}\n\n"
                    "请生成A/B测试变体方案。"
                )
            }
        ],
        max_tokens=2000,
    )

    raw = resp.choices[0].message.content or ""
    # 提取JSON（支持<think>标签和markdown代码块）
    if "```json" in raw:
        raw = raw.split("```json")[1].split("```")[0].strip()
    elif "```" in raw:
        raw = raw.split("```")[1].split("```")[0].strip()
    else:
        # 去除thinking标签
        if "<think>" in raw and "</think>" in raw:
            raw = raw.split("</think>")[-1].strip()
        start = raw.find("{")
        end = raw.rfind("}") + 1
        if start >= 0 and end > start:
            raw = raw[start:end]

    try:
        result = json.loads(raw)
        result["topic"] = topic
        result["niche"] = niche
    except json.JSONDecodeError:
        result = {
            "error": "A/B测试方案解析失败",
            "raw": raw[:500],
            "topic": topic,
            "niche": niche,
        }

    return result


register_tool(Tool(
    name="ab_agent",
    description="A/B测试方案生成，对同一内容生成2-3个差异化Hook/封面/开场版本供测试比较",
    input_schema=AB_SCHEMA,
    run=run_ab_agent,
))
