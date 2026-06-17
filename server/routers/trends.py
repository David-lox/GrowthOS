"""
热点榜路由：GET /api/trends  |  POST /api/trends/fetch
"""
from fastapi import APIRouter, Depends, HTTPException
from database import get_db
from scheduler.trend_scheduler import fetch_all_trends

router = APIRouter()


@router.post("/fetch")
async def trigger_fetch():
    """手动触发热点实时抓取"""
    try:
        count = await fetch_all_trends()
        return {"ok": True, "count": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("")
async def get_trends(platform: str | None = None, limit: int = 20, db=Depends(get_db)):
    """获取热点数据"""
    if platform:
        query = """SELECT id, platform, title, heat_score, category, url, fetched_at
                   FROM trends WHERE platform = ?
                   ORDER BY heat_score DESC, fetched_at DESC LIMIT ?"""
        params = (platform, limit)
    else:
        query = """SELECT id, platform, title, heat_score, category, url, fetched_at
                   FROM trends
                   ORDER BY fetched_at DESC, heat_score DESC LIMIT ?"""
        params = (limit,)

    async with db.execute(query, params) as cursor:
        rows = await cursor.fetchall()

    keys = ["id", "platform", "title", "heat_score", "category", "url", "fetched_at"]
    return [dict(zip(keys, row)) for row in rows]
