from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_app_settings, get_session_repository
from app.core.config import Settings
from app.models.chat import Session, SessionCreate
from app.repositories.session_repository import SessionRepository

router = APIRouter(prefix="/api/sessions", tags=["Sessões"])
Repository = Annotated[SessionRepository, Depends(get_session_repository)]


@router.post("", response_model=Session, status_code=201)
async def create_session(request: SessionCreate, repository: Repository) -> Session:
    return repository.create(request.channel)


@router.get("/{session_id}", response_model=Session)
async def get_session(
    session_id: UUID,
    repository: Repository,
    settings: Annotated[Settings, Depends(get_app_settings)],
) -> Session:
    if not settings.enable_session_inspection:
        raise HTTPException(status_code=404, detail="Consulta de sessões desabilitada.")
    return repository.get(session_id)
