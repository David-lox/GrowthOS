"""
通知定时任务
- check_review_reminders: 每小时检查，发布后 24-26h 写入复盘提醒
- check_gap_warnings: 每天 09:00 检查断更风险
"""
import json
from datetime import datetime, timezone
from database import DB_PATH
import aiosqlite


async def check_review_reminders():
    """每小时执行：发布后 24-26h 内未复盘的内容，写入提醒通知"""
    async with aiosqlite.connect(DB_PATH) as db:
        rows = await db.execute_fetchall(
            """SELECT id, user_id, topic FROM content_records
               WHERE status = 'published'
                 AND published_at BETWEEN datetime('now', '-26 hours')
                                      AND datetime('now', '-24 hours')
                 AND id NOT IN (
                     SELECT json_extract(payload, '$.content_id')
                     FROM notifications WHERE type = 'review_reminder'
                 )"""
        )
        for row in rows:
            content_id, user_id, topic = row[0], row[1], row[2]
            await db.execute(
                """INSERT INTO notifications
                   (user_id, type, payload, status, scheduled_for)
                   VALUES (?, 'review_reminder', ?, 'pending', datetime('now'))""",
                (user_id, json.dumps({"content_id": content_id, "title": topic or ""}))
            )
        await db.commit()


async def check_gap_warnings():
    """每天 09:00 检查断更风险，按天数写入不同级别预警"""
    async with aiosqlite.connect(DB_PATH) as db:
        users = await db.execute_fetchall(
            "SELECT DISTINCT user_id FROM profiles"
        )
        for (user_id,) in users:
            row = await db.execute_fetchone(
                """SELECT MAX(published_at) FROM content_records
                   WHERE user_id = ? AND status = 'published'""",
                (user_id,)
            )
            last_pub = row[0] if row else None
            if not last_pub:
                continue

            try:
                last_dt = datetime.fromisoformat(last_pub.replace("Z", "+00:00"))
                if last_dt.tzinfo is None:
                    last_dt = last_dt.replace(tzinfo=timezone.utc)
                delta = (datetime.now(timezone.utc) - last_dt).days
            except (ValueError, TypeError):
                continue

            if delta >= 14:
                level = "gap_warning_3"
            elif delta >= 7:
                level = "gap_warning_2"
            elif delta >= 4:
                level = "gap_warning_1"
            else:
                continue

            # 避免同天重复写入
            existing = await db.execute_fetchone(
                """SELECT id FROM notifications
                   WHERE user_id = ? AND type = ?
                     AND scheduled_for > datetime('now', '-20 hours')""",
                (user_id, level)
            )
            if existing:
                continue

            await db.execute(
                """INSERT INTO notifications
                   (user_id, type, payload, status, scheduled_for)
                   VALUES (?, ?, ?, 'pending', datetime('now'))""",
                (user_id, level, json.dumps({"days_since_last": delta}))
            )

        await db.commit()
