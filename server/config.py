from pathlib import Path
from pydantic_settings import BaseSettings

# 永远指向 server/ 目录，无论从哪个目录启动 uvicorn
_SERVER_DIR = Path(__file__).parent


class Settings(BaseSettings):
    dashscope_api_key: str
    dashscope_base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    model_chat: str = "qwen3-235b-a22b"
    model_search: str = "qwen-max-latest"  # 支持 enable_search 的非思维模型
    model_image: str = "qwen-image-2.0"
    tavily_api_key: str = ""
    database_url: str = str(_SERVER_DIR / "growthOS.db")
    port: int = 8000

    class Config:
        env_file = str(_SERVER_DIR / ".env")


settings = Settings()
