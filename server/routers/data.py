"""
数据路由：上传数据触发归因 + 查询历史数据
"""
import uuid
import json
from datetime import datetime
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from database import get_db

router = APIRouter()


class DataUploadRequest(BaseModel):
    user_id: str
    content_id: str | None = None
    platform: str
    views: int = 0
    likes: int = 0
    comments: int = 0
    shares: int = 0
    saves: int = 0
    new_followers: int = 0
    open_rate: float | None = None
    completion_rate: float | None = None
    engagement_rate: float | None = None
    forward_rate: float | None = None
    raw_data: dict | None = None


@router.post("/upload")
async def upload_data(req: DataUploadRequest, db=Depends(get_db)):
    """
    上传平台数据，触发归因闭环
    1. 写入 data_records
    2. 触发 attribution_loop.process()
    3. 触发 attribution_loop.verify() 检查历史归因
    4. 返回归因结果 + 历史验证反馈
    """
    from agents.data_agent import run_data_agent
    from harness.attribution_loop import AttributionLoop
    from openai import AsyncOpenAI
    from config import settings
    from memory.semantic_memory import extract_and_update

    data_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    # 计算 engagement_rate（如果未提供）
    engagement_rate = req.engagement_rate
    if engagement_rate is None and req.views > 0:
        engagement_rate = (req.likes + req.comments + req.saves) / req.views

    # 写入 data_records
    await db.execute(
        """INSERT INTO data_records
           (id, content_id, user_id, platform, views, likes, comments,
            shares, saves, new_followers, open_rate, completion_rate,
            engagement_rate, forward_rate, raw_data, recorded_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (
            data_id, req.content_id, req.user_id, req.platform,
            req.views, req.likes, req.comments, req.shares, req.saves,
            req.new_followers, req.open_rate, req.completion_rate,
            engagement_rate, req.forward_rate,
            json.dumps(req.raw_data or {}),
            now,
        )
    )
    await db.commit()

    # 获取内容信息（标题 + 赛道）
    topic = ""
    niche = ""
    if req.content_id:
        async with db.execute(
            "SELECT topic, niche FROM content_records WHERE id = ?",
            (req.content_id,)
        ) as cursor:
            row = await cursor.fetchone()
            if row:
                topic, niche = row[0] or "", row[1] or ""

    # 调用 data_agent 归因
    data_dict = {
        "views": req.views,
        "likes": req.likes,
        "comments": req.comments,
        "shares": req.shares,
        "saves": req.saves,
        "new_followers": req.new_followers,
        "open_rate": req.open_rate,
        "completion_rate": req.completion_rate,
        "engagement_rate": engagement_rate,
        "forward_rate": req.forward_rate,
    }

    attribution_result = await run_data_agent({
        "platform": req.platform,
        "data": data_dict,
        "topic": topic,
        "niche": niche,
    })

    # 执行归因闭环
    llm = AsyncOpenAI(
        api_key=settings.dashscope_api_key,
        base_url=settings.dashscope_base_url,
    )

    class _SemanticProxy:
        async def extract_and_update(self, user_id, evidence, db, llm_client):
            return await extract_and_update(user_id, evidence, db, llm_client)

    loop = AttributionLoop(db, llm, _SemanticProxy())
    closed = await loop.process(
        user_id=req.user_id,
        content_id=req.content_id or "",
        data_record_id=data_id,
        attribution={
            "platform": req.platform,
            "triggered_rule": attribution_result.get("triggered_rule"),
            "root_cause": attribution_result.get("root_cause"),
            "action_advice": attribution_result.get("action_options", [{}])[0].get("content", ""),
            "rule_candidate": attribution_result.get("rule_candidate"),
            "calendar_note": attribution_result.get("calendar_note"),
            "next_topic_filter": attribution_result.get("next_topic_filter"),
            "baseline_metrics": data_dict,
        }
    )

    # 检查历史归因验证
    verify_feedbacks = []
    if req.content_id:
        verify_feedbacks = await loop.verify(req.user_id, req.content_id)

    return {
        "data_id": data_id,
        "attribution": attribution_result,
        "closed_loop": closed,
        "verify_feedbacks": verify_feedbacks,
    }


@router.get("/{user_id}")
async def get_data_records(user_id: str, limit: int = 20, db=Depends(get_db)):
    """获取用户历史数据记录"""
    async with db.execute(
        """SELECT d.id, d.content_id, d.platform, d.views, d.likes,
                  d.comments, d.saves, d.new_followers, d.completion_rate,
                  d.engagement_rate, d.forward_rate, d.recorded_at,
                  c.topic
           FROM data_records d
           LEFT JOIN content_records c ON d.content_id = c.id
           WHERE d.user_id = ?
           ORDER BY d.recorded_at DESC LIMIT ?""",
        (user_id, limit)
    ) as cursor:
        rows = await cursor.fetchall()

    keys = ["id", "content_id", "platform", "views", "likes", "comments",
            "saves", "new_followers", "completion_rate", "engagement_rate",
            "forward_rate", "recorded_at", "topic"]
    return [dict(zip(keys, row)) for row in rows]
