"""
ReAct Loop: Reasoning + Acting 循环
支持 OpenAI function calling 流式输出
每次 yield 一个 SSE chunk dict
"""
import json
from typing import AsyncGenerator, TYPE_CHECKING

from openai import AsyncOpenAI
from config import settings
from tools.registry import get_tools_schema, TOOL_REGISTRY

if TYPE_CHECKING:
    from memory.working_memory import WorkingMemory

client = AsyncOpenAI(
    api_key=settings.dashscope_api_key,
    base_url=settings.dashscope_base_url,
)

MAX_ITERATIONS = 8


async def react_loop(
    messages: list[dict],
    working_memory: "WorkingMemory",
    agent_name: str = "orchestrator",
    extra_body: dict = None,
) -> AsyncGenerator[dict, None]:
    """
    核心 ReAct 循环，yield SSE chunks:
      {"type": "text_delta", "delta": "..."}
      {"type": "tool_call", "tool": "...", "args": {...}}
      {"type": "tool_result", "tool": "...", "result": {...}}
      {"type": "ask", "payload": {...}}          <- ask 工具专用，暂停循环
      {"type": "done"}
    """
    current_messages = list(messages)
    tools_schema = get_tools_schema()

    for iteration in range(MAX_ITERATIONS):
        stream_kwargs = dict(
            model=settings.model_chat,
            messages=current_messages,
            stream=True,
        )
        if tools_schema:
            stream_kwargs["tools"] = tools_schema
            stream_kwargs["tool_choice"] = "auto"
        if extra_body:
            stream_kwargs["extra_body"] = extra_body

        print(f"[react_loop] calling model={settings.model_chat} tools={len(tools_schema)} iteration={iteration}")
        try:
            stream = await client.chat.completions.create(**stream_kwargs)
        except Exception as e:
            print(f"[react_loop] API call failed: {type(e).__name__}: {e}")
            yield {"type": "error", "message": f"API调用失败: {e}"}
            return

        accumulated_text = ""
        tool_calls_acc: dict[int, dict] = {}  # index -> {id, name, arguments}

        async for chunk in stream:
            # 捕获 DashScope 在 stream 中内嵌的错误（choices=[]）
            if not chunk.choices:
                err = getattr(chunk, 'model_extra', {}) or {}
                err_msg = err.get('error') or err.get('message') or str(chunk)
                print(f"[react_loop] API stream error chunk: {err_msg}")
                yield {"type": "error", "message": f"模型返回错误: {err_msg}"}
                return

            delta = chunk.choices[0].delta
            if delta is None:
                continue

            # 文本 delta
            if delta.content:
                accumulated_text += delta.content
                yield {"type": "text_delta", "delta": delta.content}

            # 工具调用 delta（流式拼接）
            if delta.tool_calls:
                for tc in delta.tool_calls:
                    idx = tc.index
                    if idx not in tool_calls_acc:
                        tool_calls_acc[idx] = {"id": "", "name": "", "arguments": ""}
                    if tc.id:
                        tool_calls_acc[idx]["id"] = tc.id
                    if tc.function.name:
                        tool_calls_acc[idx]["name"] = tc.function.name
                    if tc.function.arguments:
                        tool_calls_acc[idx]["arguments"] += tc.function.arguments

        # 本轮结束后处理
        if tool_calls_acc:
            # 把助手消息（包含 tool_calls）加入对话历史
            tool_calls_for_msg = []
            for idx in sorted(tool_calls_acc.keys()):
                tc = tool_calls_acc[idx]
                tool_calls_for_msg.append({
                    "id": tc["id"],
                    "type": "function",
                    "function": {"name": tc["name"], "arguments": tc["arguments"]},
                })

            current_messages.append({
                "role": "assistant",
                "content": accumulated_text or None,
                "tool_calls": tool_calls_for_msg,
            })

            # 执行每个工具
            for idx in sorted(tool_calls_acc.keys()):
                tc = tool_calls_acc[idx]
                tool_name = tc["name"]
                try:
                    args = json.loads(tc["arguments"]) if tc["arguments"] else {}
                except json.JSONDecodeError:
                    args = {}

                yield {"type": "tool_call", "tool": tool_name, "args": args}

                # ask 工具：推给前端，暂停循环
                if tool_name == "ask":
                    yield {"type": "ask", "payload": args}
                    return  # 暂停，等待用户回答

                # 其他工具：实际执行
                tool = TOOL_REGISTRY.get(tool_name)
                if tool:
                    try:
                        result = await tool.run(args)
                    except Exception as e:
                        result = {"error": str(e)}
                else:
                    result = {"error": f"tool '{tool_name}' not found"}

                yield {"type": "tool_result", "tool": tool_name, "result": result}

                # 把 tool 结果加回对话
                current_messages.append({
                    "role": "tool",
                    "tool_call_id": tc["id"],
                    "content": json.dumps(result, ensure_ascii=False),
                })

            # 继续下一轮
            continue

        else:
            # 纯文本回复，循环结束
            if accumulated_text:
                current_messages.append({
                    "role": "assistant",
                    "content": accumulated_text,
                })
            elif not tool_calls_acc:
                # 模型既没有输出文本也没有调用工具 —— 记录日志便于排查
                print(f"[react_loop] WARNING: model '{agent_name}' returned empty response on iteration {iteration}")
            break

    yield {"type": "done"}
