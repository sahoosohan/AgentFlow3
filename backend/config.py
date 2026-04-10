# agentflow-api/config.py
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str       # service role key (backend only)
    SUPABASE_JWT_SECRET: str
    GEMINI_API_KEY: str
    REDIS_URL: str = "redis://localhost:6379"

    class Config:
        env_file = ".env"


settings = Settings()
