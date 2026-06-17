"""
attribution_loop: 归因完成后的完整闭环
归因 → 写规律库 → 写日历备注 → 写语义记忆 → 标记待验证
→ 下次数据来时自动对比 → 更新规律置信度 → 告知用户
"""
import json
import uuid
from datetime import datetime, timezone


class AttributionLoop:

    def __init__(self, db):
        self.db = db

    async def process(
        self,
        user_id: str,
        content_id: str,
        data_record_id: str,
        attribution: dict,
    ) -> dict:
        result_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        # Step 1: 写入 attribution_results
        await self.db.execute(
            """INSERT INTO attribution_results (
                id, data_record_id, content_id, user_id, platform,
                triggered_rule, root_cause, action_advice, action_template,
                rule_candidate, calendar_note, next_topic_filter,
                baseline_metrics, created_at
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                result_id, data_record_id, content_id, user_id,
                attribution.get("platform"),
                attribution.get("triggered_rule"),
                attribution.get("root_cause"),
                attribution.get("action_advice"),
                attribution.get("action_template"),
                json.dumps(attribution.get("rule_candidate")) if attribution.get("rule_candidate") else None,
                attribution.get("calendar_note"),
                attribution.get("next_topic_filter"),
                json.dumps(attribution.get("baseline_metrics")) if attribution.get("baseline_metrics") else None,
                now,
            )
        )

        # Step 2: 规律候选写入 creative_rules（初始置信度 0.6）
        rule_candidate = attribution.get("rule_candidate")
        if rule_candidate and isinstance(rule_candidate, dict):
            await self._upsert_rule(user_id, rule_candidate, confidence=0.6, source="attribution")

        # Step 3: 行动建议写入日历下一条的改进备注
        if attribution.get("calendar_note"):
            await self._attach_calendar_note(user_id, attribution["calendar_note"])

        # Step 4: 写入语义记忆（归因结论）
        if attribution.get("root_cause") and attribution.get("next_topic_filter"):
            from memory.semantic_memory import extract_and_update
            await extract_and_update(
                user_id=user_id,
                evidence=(
                    f"归因结论：{attribution['root_cause']}；"
                    f"下次选题过滤：{attribution['next_topic_filter']}"
                ),
                db=self.db,
            )

        await self.db.commit()
        return {"attribution_id": result_id, "closed_loop": True}

    async def verify(self, user_id: str, new_content_id: str) -> list[dict]:
        """用户上传新内容数据时自动触发，对比验证历史归因"""
        async with self.db.execute(
            """SELECT id, triggered_rule, root_cause, baseline_metrics, rule_candidate
               FROM attribution_results
               WHERE user_id = ? AND verified = 0
               ORDER BY created_at DESC LIMIT 5""",
            (user_id,)
        ) as cursor:
            pending = await cursor.fetchall()

        feedbacks = []
        now = datetime.now(timezone.utc).isoformat()

        for row in pending:
            attr_id, rule, cause, baseline_str, rule_str = row
            new_metrics = await self._get_metrics(new_content_id)

            try:
                baseline = json.loads(baseline_str) if baseline_str else {}
            except Exception:
                baseline = {}

            improvement = self._calc_improvement(baseline, new_metrics)

            if improvement > 0.10:
                await self._adjust_rule_confidence(user_id, rule_str, delta=+0.15)
                feedbacks.append({
                    "cause": cause,
                    "improvement": f"+{improvement * 100:.0f}%",
                    "verified": True,
                })
            elif improvement < -0.05:
                await self._adjust_rule_confidence(user_id, rule_str, delta=-0.10)
                feedbacks.append({
                    "cause": cause,
                    "improvement": f"{improvement * 100:.0f}%",
                    "verified": False,
                })

            await self.db.execute(
                """UPDATE attribution_results
                   SET verified = 1, verified_at = ?, followup_content_id = ?
                   WHERE id = ?""",
                (now, new_content_id, attr_id)
            )

        if feedbacks:
            await self.db.commit()

        return feedbacks

    def _calc_improvement(self, baseline: dict, new_metrics: dict) -> float:
        weights = {
            "completion_rate": 0.4,
            "engagement_rate": 0.3,
            "new_followers": 0.3,
        }
        total = 0.0
        for metric, weight in weights.items():
            old = baseline.get(metric) or 0
            new = new_metrics.get(metric) or 0
            if old > 0:
                total += (new - old) / old * weight
        return total

    async def _upsert_rule(self, user_id: str, rule: dict, confidence: float, source: str):
        await self.db.execute(
            """INSERT INTO creative_rules
                (id, user_id, variable, winner_logic, loser_logic,
                 metric, delta, platform, confidence, source)
               VALUES (?,?,?,?,?,?,?,?,?,?)
               ON CONFLICT(user_id, variable, platform) DO UPDATE SET
                 confidence = MIN(1.0, confidence + 0.1),
                 test_count = test_count + 1,
                 last_updated = CURRENT_TIMESTAMP""",
            (
                str(uuid.uuid4()), user_id,
                rule.get("variable"), rule.get("winner_logic"),
                rule.get("loser_logic"), rule.get("metric"),
                str(rule.get("delta", "")), rule.get("platform", "通用"),
                confidence, source,
            )
        )

    async def _attach_calendar_note(self, user_id: str, note: str):
        # SQLite 不支持 UPDATE ... ORDER BY ... LIMIT，改用子查询
        await self.db.execute(
            """UPDATE calendar SET improvement_note = ?
               WHERE id = (
                   SELECT id FROM calendar
                   WHERE user_id = ? AND status = 'planned'
                   ORDER BY scheduled_time ASC LIMIT 1
               )""",
            (note, user_id)
        )

    async def _get_metrics(self, content_id: str) -> dict:
        async with self.db.execute(
            """SELECT completion_rate, engagement_rate, new_followers, forward_rate
               FROM data_records WHERE content_id = ?
               ORDER BY recorded_at DESC LIMIT 1""",
            (content_id,)
        ) as cursor:
            row = await cursor.fetchone()
        if not row:
            return {}
        return dict(zip(
            ["completion_rate", "engagement_rate", "new_followers", "forward_rate"],
            row
        ))

    async def _adjust_rule_confidence(self, user_id: str, rule_str: str, delta: float):
        try:
            rule = json.loads(rule_str) if rule_str else None
            if rule and rule.get("variable") and rule.get("platform"):
                await self.db.execute(
                    """UPDATE creative_rules
                       SET confidence = MAX(0.0, MIN(1.0, confidence + ?)),
                           last_updated = CURRENT_TIMESTAMP
                       WHERE user_id = ? AND variable = ? AND platform = ?""",
                    (delta, user_id, rule["variable"], rule["platform"])
                )
        except Exception:
            pass
