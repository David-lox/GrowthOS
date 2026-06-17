"""
图片路由：POST /api/image/generate
直接调用 image_tool 生成图片（供前端直接触发，不经过对话流）
"""
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class ImageGenerateRequest(BaseModel):
    prompt: str
    size: str = "1024*1024"  # "1024*1024" | "720*1280" | "1280*720"
    style: str = ""


@router.post("/generate")
async def generate_image(req: ImageGenerateRequest):
    from tools.image_tool import run_generate_image
    result = await run_generate_image({
        "prompt": req.prompt,
        "size": req.size,
        "style": req.style,
    })
    return result
