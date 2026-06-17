import uuid
from datetime import datetime, timezone


class DecisionLogger:
    def __init__(self, db):
        self.db = db

    async def log(
        self,
        user_id: str,
        session_id: str,
        agent: str,
        node: str,
        intent: str = None,
        reasoning: str = None,
        tool_called: str = None,
        tool_input: dict = None,
        tool_output: dict = None,
        rules_triggered: list = None,
        memory_used: list = None,
        creative_rules_applied: list = None,
        response_type: str = None,
    ) -> str:
        log_id = str(uuid.uuid4())
        await self.db.execute(
            """
            INSERT INTO decision_logs (
                log_id, user_id, session_id, agent, node,
                intent, reasoning, tool_called, tool_input, tool_output,
                rules_triggered, memory_used, creative_rules_applied,
                response_type, created_at
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                log_id, user_id, session_id, agent, node,
                intent, reasoning, tool_called,
                str(tool_input) if tool_input else None,
                str(tool_output) if tool_output else None,
                str(rules_triggered) if rules_triggered else None,
                str(memory_used) if memory_used else None,
                str(creative_rules_applied) if creative_rules_applied else None,
                response_type,
                datetime.now(timezone.utc).isoformat(),
            ),
        )
        await self.db.commit()
        return log_id

    async def update_reaction(
        self,
        log_id: str,
        reaction: str,
        modification: str = None,
        outcome_content_id: str = None,
    ):
        await self.db.execute(
            """
            UPDATE decision_logs
            SET user_reaction = ?,
                user_modification = ?,
                outcome_content_id = ?
            WHERE log_id = ?
            """,
            (reaction, modification, outcome_content_id, log_id),
        )
        await self.db.commit()
