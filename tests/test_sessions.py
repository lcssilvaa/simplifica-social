from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.exceptions import CapacityExceeded, SessionNotFound
from app.main import create_app
from app.models.chat import Channel
from app.repositories.session_repository import InMemorySessionRepository


def test_create_and_fetch_session(client):
    response = client.post("/api/sessions", json={"channel": "WEB"})
    assert response.status_code == 201
    session = response.json()
    assert UUID(session["session_id"])
    assert session["channel"] == "WEB"
    assert session["messages"] == []
    assert all(value is None for value in session["citizen_profile"].values())
    assert client.get(f"/api/sessions/{session['session_id']}").json() == session


def test_missing_session(client):
    assert client.get(f"/api/sessions/{uuid4()}").status_code == 404


def test_expiration_and_capacity():
    now = datetime(2026, 1, 1, tzinfo=UTC)
    repository = InMemorySessionRepository(10, max_sessions=1, clock=lambda: now)
    session = repository.create(Channel.WEB)
    with pytest.raises(CapacityExceeded):
        repository.create(Channel.WEB)
    now += timedelta(seconds=9)
    assert repository.get(session.session_id).session_id == session.session_id
    now += timedelta(seconds=1)
    with pytest.raises(SessionNotFound):
        repository.get(session.session_id)
    assert repository.create(Channel.WEB).session_id != session.session_id


def test_save_renews_expiration_and_get_is_a_copy():
    now = datetime(2026, 1, 1, tzinfo=UTC)
    repository = InMemorySessionRepository(10, clock=lambda: now)
    session = repository.create(Channel.WEB)
    session.citizen_profile.idade = 67
    assert repository.get(session.session_id).citizen_profile.idade is None
    now += timedelta(seconds=9)
    repository.save(session)
    now += timedelta(seconds=9)
    assert repository.get(session.session_id).citizen_profile.idade == 67


def test_session_inspection_can_be_disabled():
    with TestClient(create_app(Settings(enable_session_inspection=False))) as client:
        session = client.post("/api/sessions", json={}).json()
        assert client.get(f"/api/sessions/{session['session_id']}").status_code == 404
