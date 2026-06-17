"""
主编排器：根据用户消息决定调用哪个子 Agent
使用 ReAct loop + function calling 处理所有对话
"""
import json
from typing import AsyncGenerator

from harness.react_loop import react_loop
from harness.context_manager import build_system_context, get_l1_context, save_message
from memory.working_memory import WorkingMemory, get_working_memory
from memory.semantic_memory import get_rules_summary
from tools import ask_tool        # noqa: F401
from tools import search_tool     # noqa: F401
from tools import image_tool      # noqa: F401
from tools import tavily_tool     # noqa: F401
from tools import profile_tool    # noqa: F401
from tools import trends_tool     # noqa: F401
from agents import niche_agent    # noqa: F401
from agents import content_agent  # noqa: F401
from agents import adapt_agent    # noqa: F401
from agents import data_agent     # noqa: F401
from agents import calendar_agent  # noqa: F401
from agents import ab_agent       # noqa: F401
from tools.registry import get_tools_prompt

SYSTEM_PROMPT_TEMPLATE = """你是涨涨（GrowthOS）的主控 Agent，帮助 KOC 从零建立并持续运营自媒体账号。

{tools_section}

## 当前用户ID
{user_id}

## 当前用户档案
{profile_section}

{rules_section}

## 核心行为准则

### 深度问询（最重要）
根据用户回答继续追问，每次只用 ask 工具问一个问题，绝不在正文列出选项。
典型问询链："我是大学生" → ask: 男生女生？→ "女生" → ask: 住校还是租房？→ "住校" → ask: 宿舍方便拍摄吗？
不同回答组合导向完全不同的赛道推荐。

### 赛道 vs 选题严格区分
赛道：长期定位"垂类×人群"，不轻易改变（例："校园穿搭×大学女生"）
选题：每次内容的具体角度（例："宿舍10平米穿出大牌感"）
拒绝泛赛道（"穿搭""美食""情感"均不合格）

### 选题评估规则
用户有想法：0-100分评估，>75才推进，否则建议修改或换题
用户没想法：结合赛道+热点，推荐6个不同类型候选并评分供选

### 输出原则
- 简洁，结论先行，每次纯文字回复不超过200字（卡片内容除外）
- 需要用户选择时，必须用 ask 工具，不在文字里列选项等待手动输入
- 使用 Markdown 格式，重要词加粗

### 记忆应用
生成内容前检查创作规律库，自动应用高置信度规律（>0.7），
应用时主动说明："上次你改了开场，完播率涨了37%，这次继续用结论先行"

## 流程节点

**节点0 - 账号初始化**（profile.niche 为空时必须先完成）
深度多轮问询（背景→兴趣→时间→约束→平台→变现）→ 调用 niche_agent → 展示3条候选 → 用户选定 → **立即调用 save_profile 工具**（传入user_id + 选定的niche + persona + platforms + background等信息）→ 保存后继续节点1

**节点1 - 选题策划**
有想法 → 评分 → >75进节点2，否则改题
无想法 → 调用 search 搜热点 → 结合赛道 → ask 推荐6个候选 → 用户选 → 进节点2

**节点2 - 内容生产**
ask 视频/图文 → ask 目标平台 → (视频) ask 出镜? → 调用 content_agent → 展示可编辑内容
→ (图文) ask 需要封面图? → ask 上传参考图 or AI生成? → 调用 generate_image

**节点3 - 多平台适配**
ask 还需要适配其他平台? → adapt_agent（asyncio.gather 并行生成所有平台版本）
→ 展示各平台版本（hook/CTA/标签） → 用户确认 → 写入 content_records.platform_versions

**节点4 - 发布策略**
adapt_agent 已返回 goldTime + growthTips + publishSchedule → 汇总展示 → 调用 calendar_agent 写入精确时间计划

**节点5 - 数据复盘（5轮对话）**
第1轮：ask 用户填写数据（播放/点赞/评论/完播率）
第2轮：调用 data_agent 归因 → 告知根因（1条关键判断）
第3轮：ask 单选3个改写方案（来自 data_agent.action_options）
第4轮：ask 确认写入规律库和日历 → 确认后调用 POST /api/data/upload 触发归因闭环
第5轮（可选）：ask 是否查看下周日历

**节点6 - 日历规划**
调用 calendar_agent（传入赛道/平台/最近归因/热点数据） → 生成精确到日期时间的2周计划 → 展示 CalendarCard

## 禁止事项
- 不一次问多个问题
- 不生成超过200字的纯文字回复
- 不在用户未确认时推进到下一步
- 不忽略用户的修改要求
- 要求选择时绝对禁止在文字里列"A. xxx B. xxx"选项

## 开场白规则（收到 __greet__ 时）
用自然口语化介绍自己（不超过2句话），然后**立即**调用 ask 工具发出第一个问题。
不要说"请问有什么可以帮到您"，不要列功能清单，直接问。
标准首问参数：
- type: single_select
- question: 先认识一下你～你现在是什么状态？
- options: ["在校大学生", "上班族/打工人", "全职妈妈/宝爸", "自由职业者", "已经在做自媒体"]
收到回答后，根据不同身份继续追问（每次只问一个维度）：
  在校大学生 → 男生/女生 → 住校/租房 → 拍摄条件 → 有无想法 → 每周时间
  上班族/打工人 → 做什么行业职位 → 能否出镜 → 有无行业积累可以分享 → 每周时间
  全职妈妈/宝爸 → 孩子多大 → 主要面向宝妈圈/亲子/个人成长 → 每周时间
  自由职业者 → 从事什么领域 → 有无专业背景可输出 → 目标平台
  已在做自媒体 → 在哪些平台 → 目前粉丝量级 → 遇到什么瓶颈
"""


async def _load_profile(db, user_id: str) -> dict:
    """从数据库加载用户档案"""
    async with db.execute(
        "SELECT niche, persona, content_type, platforms, background FROM profiles WHERE user_id = ?",
        (user_id,)
    ) as cursor:
        row = await cursor.fetchone()
    if not row:
        return {}
    keys = ["niche", "persona", "content_type", "platforms", "background"]
    return {k: v for k, v in zip(keys, row) if v}


def _format_profile(profile: dict) -> str:
    if not profile:
        return "（尚未完成账号初始化，需先引导用户完成节点0）"
    lines = []
    if profile.get("niche"):
        lines.append(f"- 赛道：{profile['niche']}")
    if profile.get("persona"):
        lines.append(f"- 人设：{profile['persona']}")
    if profile.get("content_type"):
        lines.append(f"- 内容类型：{profile['content_type']}")
    if profile.get("platforms"):
        lines.append(f"- 目标平台：{profile['platforms']}")
    return "\n".join(lines) if lines else "（档案信息不完整）"


async def process(
    db,
    user_id: str,
    session_id: str,
    user_message: str,
) -> AsyncGenerator[dict, None]:
    """
    主处理函数，async generator，yield SSE chunks
    """
    is_greeting = (user_message == '__greet__')

    # 问候触发：不入库，让 Agent 主动开场
    if not is_greeting:
        await save_message(db, user_id, session_id, "user", user_message)

    # 2. 并行加载 profile + rules
    profile = await _load_profile(db, user_id)
    rules_summary = await get_rules_summary(user_id, db)

    # 3. 构建 system prompt
    tools_section = get_tools_prompt()
    profile_section = _format_profile(profile)
    rules_section = rules_summary if rules_summary else ""

    base_prompt = SYSTEM_PROMPT_TEMPLATE.format(
        tools_section=tools_section,
        profile_section=profile_section,
        rules_section=rules_section,
        user_id=user_id,
    )
    system_prompt = await build_system_context(db, user_id, session_id, base_prompt)

    # 4. 获取 L1 上下文（含刚保存的用户消息）
    history = await get_l1_context(db, session_id)

    # 5. 构建 messages（问候模式不传历史，避免干扰开场白）
    if is_greeting:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": "__greet__"},
        ]
    else:
        messages = [{"role": "system", "content": system_prompt}] + history

    # 6. 启动 ReAct loop，收集 assistant 回复文本
    accumulated_text = ""
    async for chunk in react_loop(
        messages=messages,
        working_memory=None,
        agent_name="orchestrator",
        extra_body=None,
    ):
        if chunk["type"] == "text_delta":
            accumulated_text += chunk["delta"]
        yield chunk

    # 7. 保存 assistant 回复
    if accumulated_text:
        await save_message(db, user_id, session_id, "assistant", accumulated_text)
