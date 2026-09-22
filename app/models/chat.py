from datetime import UTC, datetime
from enum import StrEnum
from typing import Literal
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field

from app.models.benefit import BenefitAnalysis
from app.models.citizen import CitizenProfile, ProfileField


def utc_now() -> datetime:
    return datetime.now(UTC)


class Channel(StrEnum):
    WEB = "WEB"
    WHATSAPP = "WHATSAPP"


class SessionCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    channel: Channel = Channel.WEB


class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str
    created_at: datetime = Field(default_factory=utc_now)


class Session(BaseModel):
    session_id: UUID = Field(default_factory=uuid4)
    channel: Channel
    citizen_profile: CitizenProfile = Field(default_factory=CitizenProfile)
    messages: list[Message] = Field(default_factory=list)
    pending_field: ProfileField | None = None
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    session_id: UUID
    channel: Channel = Channel.WEB
    message: str = Field(min_length=1, max_length=2000)


class ChatResponse(BaseModel):
    session_id: UUID
    message: str
    profile: CitizenProfile
    possible_benefits: list[BenefitAnalysis]
    analyses: list[BenefitAnalysis]
    missing_information: list[ProfileField]
    questions: list[str]
