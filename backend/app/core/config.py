"""Core configuration: loads all environment variables per TRD Section 21."""

import os
from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    GROQ_API_KEY: str = ""
    GROQ_MODEL_NAME: str = "groq/compound-mini"
    BACKEND_CORS_ORIGINS: str = "http://localhost:3000"
    MAX_UPLOAD_SIZE_MB: int = 10
    AI_REQUEST_TIMEOUT_SECONDS: int = 60
    AI_MAX_RETRIES: int = 2
    LOG_LEVEL: str = "INFO"
    TEMP_FILE_CLEANUP_MINUTES: int = 5
    RATE_LIMIT_PER_MINUTE: int = 10
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""
    PORT: int = 8000

    @property
    def cors_origins_list(self) -> List[str]:
        origins = [origin.strip() for origin in self.BACKEND_CORS_ORIGINS.split(",") if origin.strip()]
        required = "https://ai-resume-generator-iota-gules.vercel.app"
        if required not in origins:
            origins.append(required)
        return origins

    @property
    def max_upload_size_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()
