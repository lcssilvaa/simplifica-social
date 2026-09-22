from fastapi import Request

from app.core.config import Settings
from app.repositories.session_repository import SessionRepository
from app.services.benefit_service import BenefitService
from app.services.chat_service import ChatService


def get_chat_service(request: Request) -> ChatService:
    return request.app.state.chat_service


def get_benefit_service(request: Request) -> BenefitService:
    return request.app.state.benefit_service


def get_session_repository(request: Request) -> SessionRepository:
    return request.app.state.sessions


def get_app_settings(request: Request) -> Settings:
    return request.app.state.settings
