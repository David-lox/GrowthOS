"""
content_agent: 内容生产 Agent
视频：脚本 + 分镜 + 封面文案
图文：标题 + 正文 + 封面文案
必须读取 creative_rules 并应用
"""
import json
from openai import AsyncOpenAI
from config import settings
from tools.registry import register_tool, Tool

_client = AsyncOpenAI(
    api_key=settings.dashscope_api_key,
    base_url=settings.dashscope_base_url,
)

CONTENT_SCHEMA = {
    "type": "object",
    "properties": {
        "topic": {"type": "string", "description": "内容选题"},
        "niche": {"type": "string", "description": "账号赛道（垂类×人群）"},
        "content_type": {
            "type": "string",
            "enum": ["video", "graphic"],
            "description": "内容类型"
        },
        "video_subtype": {
            "type": "string",
            "description": "视频细分类型（vlog/测评/教程/对比/记录等）"
        },
        "platforms": {
            "type": "string",
            "description": "目标发布平台（逗号分隔）"
        },
        "persona": {
            "type": "string",
            "description": "账号人设锚点"
        },
        "creative_rules": {
            "type": "string",
            "description": "已验证的创作规律（从规律库提取，高置信度优先）"
        },
        "face_on_camera": {
            "type": "boolean",
            "description": "是否出镜"
        }
    },
    "required": ["topic", "niche", "content_type"]
}

VIDEO_SYSTEM = """你是专业自媒体内容策划师，擅长生产高完播率的短视频脚本。

任务：根据选题和账号信息，生成完整可直接使用的视频内容。

## 必须遵守的规律
{creative_rules}

## 视频脚本要求
- Hook（前3秒）：必须用结论先行或悬念式，目标完播率>30%
- 每个分镜：给出具体台词/动作/时长
- 结尾：必须有关注引导（具体语句，不是"请关注我"）
- 总时长：30-60秒（短视频最佳区间）

## 封面文案要求
- 标题：制造信息差或情绪共鸣，<15字
- 副标题：补充信息，<20字
- 视觉提示：描述封面画面构成（颜色/主体/排版）

## 输出 JSON 格式（严格遵守）
{
  "script": {
    "hook": "前3秒完整台词",
    "segments": [
      {"order": 1, "content": "具体台词或旁白", "duration": "秒数", "action": "镜头动作描述"}
    ],
    "ending": "结尾引导语（完整台词）",
    "totalDuration": "预计总时长（如：45秒）"
  },
  "storyboard": [
    {
      "shot": "景别（特写/近景/中景/全景）",
      "action": "拍摄动作描述",
      "duration": "时长",
      "lightingNote": "光线建议",
      "angleNote": "角度建议"
    }
  ],
  "shootingStyle": "拍摄风格描述",
  "popularFormula": "使用了哪种爆款公式",
  "cover": {
    "title": "封面主标题",
    "subtitle": "副标题",
    "visualPrompt": "封面画面描述（用于 AI 生图）",
    "shootingTips": "自拍封面的拍摄建议"
  },
  "applied_rules": ["应用了哪些规律（供前端展示）"]
}
只输出 JSON，不要其他内容。"""

GRAPHIC_SYSTEM = """你是专业自媒体图文内容策划师，专注小红书/公众号高互动图文。

任务：根据选题和账号信息，生成完整可直接使用的图文内容。

## 必须遵守的规律
{creative_rules}

## 图文要求
- 标题：小红书风格，含表情符号，<20字，强关注引导
- 正文：markdown 格式，分段清晰，每段不超过3行
- 开头：第一句制造共鸣或提出痛点
- 结尾：评论引导（具体问题，引出互动）
- 话题标签：5-8个精准标签

## 输出 JSON 格式
{
  "title": "标题（含emoji）",
  "body": "正文（markdown格式）",
  "tags": ["话题标签1", "话题标签2"],
  "ending": "结尾引导语",
  "cover": {
    "title": "封面文字标题",
    "subtitle": "副文案",
    "visualPrompt": "封面画面描述（用于 AI 生图）"
  },
  "applied_rules": ["应用了哪些规律"]
}
只输出 JSON，不要其他内容。"""


async def run_content_agent(args: dict) -> dict:
    topic = args.get("topic", "")
    niche = args.get("niche", "")
    content_type = args.get("content_type", "video")
    video_subtype = args.get("video_subtype", "")
    platforms = args.get("platforms", "")
    persona = args.get("persona", "")
    creative_rules = args.get("creative_rules", "暂无已验证的规律，按最佳实践生成")
    face_on_camera = args.get("face_on_camera", True)

    context = f"""选题：{topic}
账号赛道：{niche}
人设：{persona}
目标平台：{platforms}
出镜：{"是" if face_on_camera else "否（需要B-roll或字幕配合）"}
{"视频类型：" + video_subtype if video_subtype else ""}"""

    if content_type == "video":
        system = VIDEO_SYSTEM.replace("{creative_rules}", creative_rules)
    else:
        system = GRAPHIC_SYSTEM.replace("{creative_rules}", creative_rules)

    resp = await _client.chat.completions.create(
        model=settings.model_chat,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": context}
        ],
    )

    content_raw = resp.choices[0].message.content.strip()
    if "```json" in content_raw:
        content_raw = content_raw.split("```json")[1].split("```")[0].strip()
    elif "```" in content_raw:
        content_raw = content_raw.split("```")[1].split("```")[0].strip()

    try:
        result = json.loads(content_raw)
        result["content_type"] = content_type
        result["topic"] = topic
        result["niche"] = niche
    except json.JSONDecodeError:
        result = {"error": "内容生成解析失败", "raw": content_raw, "content_type": content_type}

    return result


register_tool(Tool(
    name="content_agent",
    description="内容生产，根据选题和账号档案生成可直接使用的视频脚本/图文内容/分镜/封面文案",
    input_schema=CONTENT_SCHEMA,
    run=run_content_agent,
))
