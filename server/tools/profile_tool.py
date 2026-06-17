"""
profile_tool：保存用户档案到数据库
在赛道确认、信息更新后调用
"""
import aiosqlite
from datetime import datetime, timezone
from config import settings
from tools.registry import register_tool, Tool

PROFILE_SCHEMA = {
    "type": "object",
    "properties": {
        "user_id": {
            "type": "string",
            "description": "用户ID（从系统提示中获取）"
        },
        "niche": {
            "type": "string",
            "description": "账号赛道（垂类×人群，如：通勤穿搭×职场女性）"
        },
        "persona": {
            "type": "string",
            "description": "人设锚点一句话描述"
        },
        "content_type": {
            "type": "string",
            "enum": ["video", "graphic", "both"],
            "description": "内容类型"
        },
        "platforms": {
            "type": "string",
            "description": "目标平台（逗号分隔，如：抖音,小红书）"
        },
        "weekly_hours": {
            "type": "integer",
            "description": "每周可用于创作的小时数"
        },
        "monetization": {
            "type": "string",
            "description": "变现目标"
        },
        "background": {
            "type": "string",
            "description": "用户背景描述"
        }
    },
    "required": ["user_id"]
}


async def run_save_profile(args: dict) -> dict:
    user_id = args.get("user_id", "")
    if not user_id:
        return {"error": "user_id 必填"}

    now = datetime.now(timezone.utc).isoformat()

    async with aiosqlite.connect(settings.database_url) as db:
        await db.execute(
            """INSERT INTO profiles (user_id, niche, persona, content_type,
                   platforms, weekly_hours, monetization, background, created_at, updated_at)
               VALUES (?,?,?,?,?,?,?,?,?,?)
               ON CONFLICT(user_id) DO UPDATE SET
                 niche = COALESCE(excluded.niche, niche),
                 persona = COALESCE(excluded.persona, persona),
                 content_type = COALESCE(excluded.content_type, content_type),
                 platforms = COALESCE(excluded.platforms, platforms),
                 weekly_hours = COALESCE(excluded.weekly_hours, weekly_hours),
                 monetization = COALESCE(excluded.monetization, monetization),
                 background = COALESCE(excluded.background, background),
                 updated_at = excluded.updated_at""",
            (
                user_id,
                args.get("niche"),
                args.get("persona"),
                args.get("content_type"),
                args.get("platforms"),
                args.get("weekly_hours"),
                args.get("monetization"),
                args.get("background"),
                now, now,
            )
        )
        await db.commit()

    return {"ok": True, "saved": {k: v for k, v in args.items() if v and k != "user_id"}}


register_tool(Tool(
    name="save_profile",
    description="保存用户账号档案（赛道/人设/平台/背景）到数据库。用户确认赛道后必须立即调用。",
    input_schema=PROFILE_SCHEMA,
    run=run_save_profile,
))
