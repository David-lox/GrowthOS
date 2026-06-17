from tools.registry import Tool, register_tool

ASK_TOOL_SCHEMA = {
    "type": "object",
    "properties": {
        "question": {
            "type": "string",
            "description": "向用户提出的问题"
        },
        "type": {
            "type": "string",
            "enum": ["single_select", "multi_select", "text_input", "confirm"],
            "description": "交互类型：单选/多选/文本输入/确认"
        },
        "options": {
            "type": "array",
            "items": {"type": "string"},
            "description": "选项列表（single_select 和 multi_select 时必填）"
        },
        "placeholder": {
            "type": "string",
            "description": "text_input 类型的输入框占位文字"
        }
    },
    "required": ["question", "type"]
}


async def run_ask(input_data: dict) -> dict:
    # ask 工具不实际执行，由 react_loop 拦截后暂停并推给前端
    return input_data


register_tool(Tool(
    name="ask",
    description="向用户提问并等待回答。需要用户做选择或输入信息时必须调用此工具，不在文字中列选项。",
    input_schema=ASK_TOOL_SCHEMA,
    run=run_ask,
))
