"""
calendar_agent：内容日历规划
结合热点和归因数据，生成精确到具体日期时间的发布计划
不做超过2周的规划
"""
import json
from datetime import datetime, timedelta
from openai import AsyncOpenAI
from config import settings
from tools.registry import register_tool, Tool

CALENDAR_SYSTEM = """你是专业的内容日历规划师，帮助 KOC 创作者制定精确的发布计划。

当前日期：{today}

规划原则：
1. 只做未来2周内的规划（不超过14天）
2. 每条计划必须精确到具体日期时间（如 2026-05-22 20:00）
3. 发布时间参考平台黄金时段：
   - 抖音：周二/四/六 晚7-9点
   - 小红书：周三/五 午12-13点或晚9-10点
   - 视频号：周四/日 晚8-9点
   - 公众号：周二/四 早8-9点或晚8-9点
   - B站：周五/六 晚8-10点
4. 选题过滤：相关度<60%过滤；近4条同类降权；偏移赛道方向降权
5. 选题提权：平台热点+30%；历史表现好+20%；归因方向一致+20%

以 JSON 格式返回：
{
  "weekPlan": [
    {
      "topic": "具体选题",
      "platform": "平台",
      "scheduledTime": "YYYY-MM-DD HH:MM",
      "reason": "为什么选这个选题（1-2句）",
      "trendBasis": "热点依据（来自哪个趋势）",
      "reminder": {
        "advanceHours": 2,
        "message": "发布前提醒内容"
      },
      "improvementNote": "本次需注意的改进点（来自上次归因）"
    }
  ],
  "publishOrder": "发布顺序建议",
  "calendarNote": "整体规划备注",
  "nextReviewDate": "下次复盘日期（YYYY-MM-DD）"
}"""


async def run_calendar_agent(params: dict) -> dict:
    """
    内容日历规划
    params:
      - user_id: 用户ID
      - niche: 赛道
      - platforms: 目标平台列表
      - weekly_hours: 每周可投入小时数
      - recent_attribution: 最近归因结论（可选）
      - trends: 热点数据（可选）
      - content_history: 最近内容历史（可选）
    """
    niche = params.get("niche", "")
    platforms = params.get("platforms", ["douyin"])
    weekly_hours = params.get("weekly_hours", 10)
    recent_attribution = params.get("recent_attribution", "")
    trends = params.get("trends", [])
    content_history = params.get("content_history", [])

    if not niche:
        return {"error": "缺少 niche 参数"}

    today = datetime.now().strftime("%Y-%m-%d（%A）")

    # 计算建议的每周发布频次（基于可用时间）
    if weekly_hours <= 5:
        freq_hint = "建议每周发布1-2条"
    elif weekly_hours <= 15:
        freq_hint = "建议每周发布2-3条"
    else:
        freq_hint = "建议每周发布3-5条"

    trends_text = ""
    if trends:
        trends_text = "\n\n当前热点：\n" + "\n".join(
            f"- [{t.get('platform', '')}] {t.get('title', '')} (热度:{t.get('heat_score', '')})"
            for t in trends[:10]
        )

    attribution_text = ""
    if recent_attribution:
        attribution_text = f"\n\n上次归因结论：{recent_attribution}"

    history_text = ""
    if content_history:
        history_text = "\n\n近期内容：\n" + "\n".join(
            f"- {c.get('topic', '')} / {c.get('platform', '')} / {c.get('status', '')}"
            for c in content_history[:5]
        )

    llm = AsyncOpenAI(
        api_key=settings.dashscope_api_key,
        base_url=settings.dashscope_base_url,
    )

    resp = await llm.chat.completions.create(
        model=settings.model_chat,
        messages=[
            {"role": "system", "content": CALENDAR_SYSTEM.replace("{today}", today)},
            {
                "role": "user",
                "content": (
                    f"赛道：{niche}\n"
                    f"目标平台：{', '.join(platforms)}\n"
                    f"每周可用时间：{weekly_hours}小时（{freq_hint}）"
                    f"{trends_text}"
                    f"{attribution_text}"
                    f"{history_text}\n\n"
                    "请生成未来2周的内容日历，精确到每条内容的发布日期和时间。"
                )
            }
        ],
        max_tokens=2000,
        extra_body={"enable_thinking": False},
    )

    raw = resp.choices[0].message.content or ""
    start = raw.find("{")
    end = raw.rfind("}") + 1
    if start >= 0 and end > start:
        try:
            result = json.loads(raw[start:end])
            result["generatedAt"] = datetime.now().strftime("%Y-%m-%d %H:%M")
            return result
        except json.JSONDecodeError:
            pass

    # 生成默认计划
    base_date = datetime.now()
    default_plan = []
    for i, platform in enumerate(platforms[:2]):
        schedule_day = base_date + timedelta(days=3 + i * 2)
        default_plan.append({
            "topic": f"（请手动填写{niche}方向的选题）",
            "platform": platform,
            "scheduledTime": schedule_day.strftime("%Y-%m-%d 20:00"),
            "reason": "默认计划，请根据实际情况调整",
            "trendBasis": "",
            "reminder": {"advanceHours": 2, "message": "准备发布内容"},
            "improvementNote": "",
        })

    return {
        "weekPlan": default_plan,
        "publishOrder": "按平台黄金时段排列",
        "calendarNote": raw[:200] if raw else "请重新生成",
        "nextReviewDate": (base_date + timedelta(days=7)).strftime("%Y-%m-%d"),
        "generatedAt": datetime.now().strftime("%Y-%m-%d %H:%M"),
    }


register_tool(Tool(
    name="calendar_agent",
    description="内容日历规划，结合热点和归因数据，生成精确到具体日期时间的发布计划（2周内）",
    input_schema={
        "type": "object",
        "properties": {
            "niche": {"type": "string", "description": "账号赛道"},
            "platforms": {
                "type": "array",
                "items": {"type": "string"},
                "description": "目标平台列表"
            },
            "weekly_hours": {"type": "integer", "description": "每周可投入小时数"},
            "recent_attribution": {"type": "string", "description": "最近归因结论（可选）"},
            "trends": {"type": "array", "description": "热点数据列表（可选）"},
            "content_history": {"type": "array", "description": "最近内容历史（可选）"},
        },
        "required": ["niche", "platforms"],
    },
    run=run_calendar_agent,
))
