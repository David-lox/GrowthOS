from dataclasses import dataclass, field
from typing import Any

@dataclass
class WorkingMemory:
    user_id: str
    session_id: str
    current_node: str = "node0_init"
    pending_content: dict = field(default_factory=dict)
    last_tool_results: dict = field(default_factory=dict)
    user_choices: list = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "current_node": self.current_node,
            "pending_content": self.pending_content,
            "last_tool_results": self.last_tool_results,
            "user_choices": self.user_choices[-5:],  # 只保留最近5个选择
        }


_sessions: dict[str, WorkingMemory] = {}


def get_working_memory(session_id: str, user_id: str) -> WorkingMemory:
    if session_id not in _sessions:
        _sessions[session_id] = WorkingMemory(
            user_id=user_id, session_id=session_id
        )
    return _sessions[session_id]


def clear_working_memory(session_id: str):
    _sessions.pop(session_id, None)
