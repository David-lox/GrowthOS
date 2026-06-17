from dataclasses import dataclass
from typing import Any, Callable, Coroutine

@dataclass
class Tool:
    name: str
    description: str
    input_schema: dict
    run: Callable[..., Coroutine[Any, Any, dict]]

TOOL_REGISTRY: dict[str, Tool] = {}


def register_tool(tool: Tool):
    TOOL_REGISTRY[tool.name] = tool


def get_tools_schema() -> list[dict]:
    """生成 OpenAI function calling 格式的 tools 列表"""
    tools = []
    for name, tool in TOOL_REGISTRY.items():
        tools.append({
            "type": "function",
            "function": {
                "name": name,
                "description": tool.description,
                "parameters": tool.input_schema if tool.input_schema else {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            }
        })
    return tools


def get_tools_prompt() -> str:
    """生成工具描述文本，注入 system prompt"""
    lines = ["## 你可以调用的工具和子 Agent"]
    for name, tool in TOOL_REGISTRY.items():
        lines.append(f"- **{name}**: {tool.description}")
    return "\n".join(lines)
