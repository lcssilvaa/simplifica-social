import asyncio
from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import AsyncContextManager, Protocol
from uuid import UUID

from app.core.exceptions import CapacityExceeded, SessionNotFound
from app.models.chat import Channel, Session, utc_now


class SessionRepository(Protocol):
    def create(self, channel: Channel) -> Session: ...
    def get(self, session_id: UUID) -> Session: ...
    def save(self, session: Session) -> None: ...
    def transaction(self, session_id: UUID) -> AsyncContextManager[None]: ...


class InMemorySessionRepository:
    def __init__(
        self,
        ttl_seconds: int,
        max_sessions: int = 1000,
        clock: Callable[[], datetime] = utc_now,
    ) -> None:
        self._ttl = timedelta(seconds=ttl_seconds)
        self._max_sessions = max_sessions
        self._clock = clock
        self._sessions: dict[UUID, Session] = {}
        self._locks: dict[UUID, asyncio.Lock] = {}

    def purge_expired(self) -> None:
        now = self._clock()
        expired = [
            key
            for key, session in self._sessions.items()
            if now - session.updated_at >= self._ttl and not self._locks[key].locked()
        ]
        for key in expired:
            del self._sessions[key]
            del self._locks[key]

    def create(self, channel: Channel) -> Session:
        self.purge_expired()
        if len(self._sessions) >= self._max_sessions:
            raise CapacityExceeded()
        now = self._clock()
        session = Session(channel=channel, created_at=now, updated_at=now)
        self._sessions[session.session_id] = session
        self._locks[session.session_id] = asyncio.Lock()
        return session.model_copy(deep=True)

    def get(self, session_id: UUID) -> Session:
        self.purge_expired()
        session = self._sessions.get(session_id)
        if session is None or self._clock() - session.updated_at >= self._ttl:
            raise SessionNotFound()
        return session.model_copy(deep=True)

    def save(self, session: Session) -> None:
        self.get(session.session_id)
        session.updated_at = self._clock()
        self._sessions[session.session_id] = session.model_copy(deep=True)

    @asynccontextmanager
    async def transaction(self, session_id: UUID) -> AsyncIterator[None]:
        self.get(session_id)
        async with self._locks[session_id]:
            self.get(session_id)
            yield
