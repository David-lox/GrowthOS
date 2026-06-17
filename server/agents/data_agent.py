"""
data_agent：驱动 5 轮结构化复盘对话
归因 → 给 3 个可用行动选项 → 写规律库/日历/记忆
"""
import json
from openai import AsyncOpenAI
from config import settings
from tools.registry import register_tool, Tool

# 归因规则库（11条，按平台算法权重触发）
ATTRIBUTION_RULES = [
    {
        "id": "douyin_completion",
        "platform": "douyin",
        "condition": "completion_rate < 0.30",
        "triggered_rule": "抖音完播率低于及格线(30%)",
        "root_cause_hint": "前3秒钩子失效，用户在开场划走",
        "action_type": "rewrite_hook",
        "weight": 40,
    },
    {
        "id": "douyin_follow",
        "platform": "douyin",
        "condition": "follow_rate < 0.01",
        "triggered_rule": "抖音关注转化率低",
        "root_cause_hint": "缺少明确的关注引导语",
        "action_type": "add_follow_cta",
        "weight": 30,
    },
    {
        "id": "xhs_ces",
        "platform": "xiaohongshu",
        "condition": "engagement_rate < 0.05",
        "triggered_rule": "小红书CES综合分低",
        "root_cause_hint": "缺少关注+评论双引导，互动权重未充分利用",
        "action_type": "add_dual_cta",
        "weight": 40,
    },
    {
        "id": "xhs_cover",
        "platform": "xiaohongshu",
        "condition": "click_rate < 0.03",
        "triggered_rule": "小红书封面点击率低",
        "root_cause_hint": "封面标题缺少数字、情绪词或关键词",
        "action_type": "rewrite_cover",
        "weight": 30,
    },
    {
        "id": "shipinhao_share",
        "platform": "shipinhao",
        "condition": "forward_rate < 0.02",
        "triggered_rule": "视频号转发率低",
        "root_cause_hint": "缺少具体转发场景引导，社交关系链未激活",
        "action_type": "add_share_scene",
        "weight": 60,
    },
    {
        "id": "weixin_open",
        "platform": "weixin",
        "condition": "open_rate < 0.05",
        "triggered_rule": "公众号打开率低于5%",
        "root_cause_hint": "标题不够吸引，缺乏好奇心或利益点",
        "action_type": "rewrite_titles",
        "weight": 50,
    },
    {
        "id": "general_likes",
        "platform": "any",
        "condition": "likes < 100",
        "triggered_rule": "点赞量偏低",
        "root_cause_hint": "内容价值感不足或共鸣点不够强",
        "action_type": "enhance_value",
        "weight": 20,
    },
    {
        "id": "general_comments",
        "platform": "any",
        "condition": "comments < 20",
        "triggered_rule": "评论区冷清",
        "root_cause_hint": "没有设置评论引导问题，或内容没有争议点",
        "action_type": "add_comment_hook",
        "weight": 20,
    },
    {
        "id": "general_saves",
        "platform": "any",
        "condition": "saves < 50",
        "triggered_rule": "收藏量低",
        "root_cause_hint": "内容干货密度不足，没有让用户值得收藏的信息",
        "action_type": "add_cheatsheet",
        "weight": 15,
    },
    {
        "id": "bilibili_completion",
        "platform": "bilibili",
        "condition": "completion_rate < 0.40",
        "triggered_rule": "B站完播率低于40%",
        "root_cause_hint": "视频节奏拖沓或前15秒没说清楚价值点",
        "action_type": "restructure_intro",
        "weight": 35,
    },
    {
        "id": "general_new_followers",
        "platform": "any",
        "condition": "new_followers < 10",
        "triggered_rule": "涨粉效率低",
        "root_cause_hint": "账号定位不清晰，或关注引导时机不对",
        "action_type": "clarify_positioning",
        "weight": 25,
    },
]

DATA_AGENT_SYSTEM = """你是专业的社媒数据复盘分析师。
根据用户提供的数据，按照平台算法权重进行归因分析，给出可直接使用的改进方案。

分析规则：
1. 优先分析权重最高的指标问题（各平台核心指标不同）
2. 给出根因（不只是现象），从内容/策略/时机多维度分析
3. action_options 必须是3个可直接使用的文案/改写版本，不是建议
4. rule_candidate 用于写入创作规律库，需要 variable/winner_logic/loser_logic 结构

以 JSON 格式返回：
{
  "platform": "平台名",
  "triggered_rule": "触发的归因规则（哪个指标异常）",
  "root_cause": "根因分析（2-3句话，从内容维度解释）",
  "data_summary": {
    "highlight": "最突出的指标表现",
    "problem": "最需要改进的指标",
    "baseline_compare": "与及格线对比"
  },
  "action_options": [
    {"label": "方案A", "content": "完整可用文案"},
    {"label": "方案B", "content": "完整可用文案"},
    {"label": "方案C", "content": "完整可用文案"}
  ],
  "rule_candidate": {
    "variable": "被测变量（如 hook_style）",
    "winner_logic": "有效的做法",
    "loser_logic": "无效的做法",
    "metric": "关联指标（如 completion_rate）",
    "delta": "预期改善幅度（如 +10-20%）",
    "platform": "平台"
  },
  "calendar_note": "写入下次日历的改进备注（一句话）",
  "next_topic_filter": "下次选题时需注意的过滤条件"
}"""


async def run_data_agent(params: dict) -> dict:
    """
    数据归因分析
    params:
      - platform: 平台
      - data: 数据记录 {views, likes, comments, shares, saves, new_followers,
                        completion_rate, engagement_rate, forward_rate, open_rate}
      - topic: 内容标题（可选）
      - niche: 赛道（可选）
    """
    platform = params.get("platform", "douyin")
    data = params.get("data", {})
    topic = params.get("topic", "")
    niche = params.get("niche", "")

    if not data:
        return {"error": "缺少 data 参数"}

    # 检测触发哪条规则（基于数值）
    triggered = []
    for rule in ATTRIBUTION_RULES:
        if rule["platform"] not in (platform, "any"):
            continue
        try:
            condition = rule["condition"]
            # 安全地评估条件（只允许数值比较）
            field, op, threshold = condition.split()
            val = data.get(field)
            if val is not None:
                threshold_val = float(threshold)
                if op == "<" and float(val) < threshold_val:
                    triggered.append(rule)
                elif op == ">" and float(val) > threshold_val:
                    triggered.append(rule)
        except Exception:
            continue

    # 选择权重最高的触发规则
    triggered.sort(key=lambda r: r["weight"], reverse=True)
    top_rule = triggered[0] if triggered else None

    # 构建分析提示
    data_str = json.dumps(data, ensure_ascii=False, indent=2)
    rule_hint = f"\n\n已检测到主要问题：{top_rule['root_cause_hint']}" if top_rule else ""

    llm = AsyncOpenAI(
        api_key=settings.dashscope_api_key,
        base_url=settings.dashscope_base_url,
    )

    resp = await llm.chat.completions.create(
        model=settings.model_chat,
        messages=[
            {"role": "system", "content": DATA_AGENT_SYSTEM},
            {
                "role": "user",
                "content": (
                    f"平台：{platform}\n"
                    f"内容主题：{topic or '未知'}\n"
                    f"赛道：{niche or '未知'}\n"
                    f"数据：\n{data_str}"
                    f"{rule_hint}\n\n"
                    "请进行归因分析，给出3个可直接使用的改写方案。"
                )
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
            result["raw_data"] = data
            if top_rule:
                result["triggered_rule_id"] = top_rule["id"]
            return result
        except json.JSONDecodeError:
            pass

    return {
        "platform": platform,
        "triggered_rule": top_rule["triggered_rule"] if top_rule else "数据偏低",
        "root_cause": top_rule["root_cause_hint"] if top_rule else "请重试",
        "data_summary": {"highlight": "", "problem": "", "baseline_compare": ""},
        "action_options": [],
        "rule_candidate": None,
        "calendar_note": "",
        "next_topic_filter": "",
        "raw_data": data,
        "parse_error": raw[:500],
    }


register_tool(Tool(
    name="data_agent",
    description="数据归因分析，根据平台数据触发11条归因规则，输出根因+3个可用行动方案+规律候选",
    input_schema={
        "type": "object",
        "properties": {
            "platform": {
                "type": "string",
                "enum": ["douyin", "xiaohongshu", "shipinhao", "weixin", "bilibili"],
                "description": "数据来源平台"
            },
            "data": {
                "type": "object",
                "description": "数据记录，包含 views/likes/comments/saves/new_followers/completion_rate/engagement_rate 等字段"
            },
            "topic": {"type": "string", "description": "内容标题（可选）"},
            "niche": {"type": "string", "description": "账号赛道（可选）"},
        },
        "required": ["platform", "data"],
    },
    run=run_data_agent,
))
