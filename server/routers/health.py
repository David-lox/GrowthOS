"""
账号健康度路由：GET /api/health/{user_id}
计算 0-100 综合健康分，包含各维度子分
"""
from fastapi import APIRouter
import aiosqlite
from database import DB_PATH

router = APIRouter()


@router.get("/{user_id}")
async def get_health(user_id: str):
    """
    账号健康看板：
    - 内容活跃度 (25分)：最近30天发布频次
    - 数据表现 (25分)：近5条内容平均指标
    - 规律积累 (20分)：创作规律库置信度和数量
    - 归因完成率 (15分)：已复盘占比
    - 记忆丰富度 (15分)：语义记忆条数
    """
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row

        # 1. 内容活跃度：最近30天发布数
        async with db.execute(
            """SELECT COUNT(*) as cnt FROM content_records
               WHERE user_id = ? AND created_at > datetime('now', '-30 days')""",
            (user_id,)
        ) as cur:
            row = await cur.fetchone()
            published_30d = row["cnt"] if row else 0

        # 2. 最近5条内容的平均数据
        async with db.execute(
            """SELECT AVG(d.completion_rate) as avg_completion,
                      AVG(d.engagement_rate) as avg_engagement,
                      AVG(d.new_followers) as avg_followers
               FROM data_records d
               WHERE d.user_id = ?
               ORDER BY d.recorded_at DESC LIMIT 5""",
            (user_id,)
        ) as cur:
            row = await cur.fetchone()
            avg_completion = (row["avg_completion"] or 0) if row else 0
            avg_engagement = (row["avg_engagement"] or 0) if row else 0
            avg_followers = (row["avg_followers"] or 0) if row else 0

        # 3. 规律库：数量 + 平均置信度
        async with db.execute(
            """SELECT COUNT(*) as cnt, AVG(confidence) as avg_conf
               FROM creative_rules WHERE user_id = ?""",
            (user_id,)
        ) as cur:
            row = await cur.fetchone()
            rules_count = (row["cnt"] or 0) if row else 0
            rules_avg_conf = (row["avg_conf"] or 0) if row else 0

        # 4. 归因完成率
        async with db.execute(
            """SELECT COUNT(*) as total,
                      SUM(CASE WHEN verified = 1 THEN 1 ELSE 0 END) as verified_cnt
               FROM attribution_results WHERE user_id = ?""",
            (user_id,)
        ) as cur:
            row = await cur.fetchone()
            attr_total = (row["total"] or 0) if row else 0
            attr_verified = (row["verified_cnt"] or 0) if row else 0

        # 5. 语义记忆条数
        async with db.execute(
            "SELECT COUNT(*) as cnt FROM user_memory WHERE user_id = ?",
            (user_id,)
        ) as cur:
            row = await cur.fetchone()
            memory_count = (row["cnt"] or 0) if row else 0

        # 6. 最近一次发布时间（断更检测）
        async with db.execute(
            """SELECT MAX(created_at) as last_pub FROM content_records
               WHERE user_id = ?""",
            (user_id,)
        ) as cur:
            row = await cur.fetchone()
            last_pub = row["last_pub"] if row else None

    # ──── 计算各维度分数 ────────────────────────────────────────

    # 内容活跃度 (25分)
    # 30天发1条得10分，4条满分
    activity_score = min(25, int(published_30d / 4 * 25))

    # 数据表现 (25分)
    # 完播率>30%得10分，互动率>3%得8分，平均涨粉>10得7分
    data_score = 0
    if avg_completion >= 0.3:
        data_score += 10
    elif avg_completion > 0:
        data_score += int(avg_completion / 0.3 * 10)
    if avg_engagement >= 0.03:
        data_score += 8
    elif avg_engagement > 0:
        data_score += int(avg_engagement / 0.03 * 8)
    if avg_followers >= 10:
        data_score += 7
    elif avg_followers > 0:
        data_score += int(min(avg_followers / 10, 1) * 7)

    # 规律积累 (20分)
    # 5条规律满分，置信度>0.7加权
    rules_score = min(20, int(rules_count / 5 * 20 * (0.5 + 0.5 * rules_avg_conf)))

    # 归因完成率 (15分)
    attr_rate = (attr_verified / attr_total) if attr_total > 0 else 0
    attribution_score = min(15, int(attr_rate * 15)) if attr_total > 0 else 5

    # 记忆丰富度 (15分)
    memory_score = min(15, int(memory_count / 10 * 15))

    total_score = activity_score + data_score + rules_score + attribution_score + memory_score

    # ──── 健康状态 ────────────────────────────────────────
    if total_score >= 80:
        status = "excellent"
        status_label = "优秀"
    elif total_score >= 60:
        status = "good"
        status_label = "良好"
    elif total_score >= 40:
        status = "fair"
        status_label = "一般"
    else:
        status = "poor"
        status_label = "需改善"

    # 断更天数
    gap_days = None
    if last_pub:
        import re
        from datetime import datetime, timezone
        try:
            dt = datetime.fromisoformat(last_pub.replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            gap_days = (datetime.now(timezone.utc) - dt).days
        except Exception:
            gap_days = None

    return {
        "user_id": user_id,
        "total_score": total_score,
        "status": status,
        "status_label": status_label,
        "dimensions": {
            "activity": {
                "score": activity_score,
                "max": 25,
                "label": "内容活跃度",
                "detail": f"近30天发布 {published_30d} 条",
            },
            "data_performance": {
                "score": data_score,
                "max": 25,
                "label": "数据表现",
                "detail": (
                    f"完播率 {avg_completion*100:.1f}% / "
                    f"互动率 {avg_engagement*100:.1f}% / "
                    f"均涨粉 {avg_followers:.0f}"
                ),
            },
            "rules": {
                "score": rules_score,
                "max": 20,
                "label": "规律积累",
                "detail": f"{rules_count} 条规律，平均置信度 {rules_avg_conf*100:.0f}%",
            },
            "attribution": {
                "score": attribution_score,
                "max": 15,
                "label": "归因完成率",
                "detail": f"{attr_verified}/{attr_total} 已验证",
            },
            "memory": {
                "score": memory_score,
                "max": 15,
                "label": "记忆丰富度",
                "detail": f"{memory_count} 条用户偏好",
            },
        },
        "gap_days": gap_days,
        "last_published": last_pub,
    }
