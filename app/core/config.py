import os
from pathlib import Path
from typing import Literal

from dotenv import dotenv_values
from pydantic import BaseModel, Field

PROJECT_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseModel):
    app_name: str = "Simplifica Social"
    llm_provider: Literal["mock", "ollama"] = "mock"
    ollama_host: str = Field(default="http://localhost:11434", min_length=1)
    ollama_model: str = Field(default="qwen3:4b", min_length=1)
    ollama_timeout_seconds: float = Field(default=120, gt=0, allow_inf_nan=False)
    session_ttl_seconds: int = Field(default=3600, gt=0)
    max_sessions: int = Field(default=1000, gt=0)
    max_messages_per_session: int = Field(default=100, ge=2)
    enable_session_inspection: bool = True
    benefits_path: Path = PROJECT_ROOT / "app/data/benefits.json"


def get_settings() -> Settings:
    values = {**dotenv_values(PROJECT_ROOT / ".env"), **os.environ}
    settings = Settings.model_validate(
        {
            name: values[name.upper()]
            for name in Settings.model_fields
            if name.upper() in values
        }
    )
    if not settings.benefits_path.is_absolute():
        settings.benefits_path = PROJECT_ROOT / settings.benefits_path
    return settings
