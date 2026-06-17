"""
image_tool: 调用 qwen-image-2.0 生成图片
使用 DashScope multimodal-generation 原生接口（MultiModalConversation 格式）
"""
import httpx
from config import settings
from tools.registry import register_tool, Tool

# qwen-image-2.0 使用 multimodal-generation 接口
IMAGE_API_URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation"

IMAGE_SCHEMA = {
    "type": "object",
    "properties": {
        "prompt": {
            "type": "string",
            "description": "图片生成提示词（中英文均可）"
        },
        "n": {
            "type": "integer",
            "description": "生成图片数量，默认 1，最多 4"
        }
    },
    "required": ["prompt"]
}


async def run_image_generation(args: dict) -> dict:
    prompt = args.get("prompt", "")
    n = min(args.get("n", 1), 4)

    headers = {
        "Authorization": f"Bearer {settings.dashscope_api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": settings.model_image,
        "input": {
            "messages": [
                {
                    "role": "user",
                    "content": [{"text": prompt}],
                }
            ]
        },
        "parameters": {
            "result_format": "message",
            "n": n,
            "watermark": False,
        },
    }

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(IMAGE_API_URL, json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()

    # 解析响应：output.choices[].message.content[].image
    choices = data.get("output", {}).get("choices", [])
    if not choices:
        return {"error": "图片生成失败，无结果", "detail": str(data)}

    images = []
    for choice in choices:
        content = choice.get("message", {}).get("content", [])
        for item in content:
            url = item.get("image") or item.get("image_url", {}).get("url", "")
            if url:
                images.append(url)

    if not images:
        return {"error": "生成成功但未找到图片 URL", "detail": str(data)}

    return {
        "url": images[0],
        "urls": images,
        "prompt": prompt,
    }


register_tool(Tool(
    name="generate_image",
    description="AI 生成封面图/配图，使用 qwen-image-2.0 模型。需要描述性 prompt，支持同时生成多张图（n=1~4）",
    input_schema=IMAGE_SCHEMA,
    run=run_image_generation,
))
