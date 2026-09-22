import json
from unittest.mock import AsyncMock

import httpx
import pytest
from fastapi.testclient import TestClient
from ollama import AsyncClient, ChatResponse, ResponseError

from app.core.config import Settings, get_settings
from app.main import create_app


def mock_chat(monkeypatch, content=None, error=None):
    chat = AsyncMock(
        return_value=ChatResponse(message={"role": "assistant", "content": content}),
        side_effect=error,
    )
    monkeypatch.setattr(AsyncClient, "chat", chat)
    return chat


def send(client, session_id, message):
    return client.post("/api/chat", json={"session_id": session_id, "message": message})


def test_ollama_extraction_context_corrections_and_deterministic_response(monkeypatch):
    chat = mock_chat(monkeypatch, '{"idade":67,"quantidade_pessoas_familia":1}')
    with TestClient(create_app(Settings(llm_provider="ollama"))) as client:
        session_id = client.post("/api/sessions", json={}).json()["session_id"]
        first = send(client, session_id, "Completei sessenta e sete anos e vivo só")
        assert first.status_code == 200
        assert first.json()["profile"]["idade"] == 67
        assert "não confirma direito" in first.json()["message"]
        assert first.json()["message"].endswith(first.json()["questions"][0])
        chat.return_value = ChatResponse(message={"role": "assistant", "content": '{"renda_familiar":600}'})
        second = send(client, session_id, "600")
        assert second.status_code == 200
        assert second.json()["profile"]["idade"] == 67
        assert second.json()["profile"]["renda_per_capita"] == 600
        request = chat.call_args.kwargs
        context = json.loads(request["messages"][1]["content"])
        assert context["campo_pendente"] == "renda_familiar"
        assert context["perfil_anterior"]["idade"] == 67
        assert "renda_per_capita" not in request["format"]["properties"]
        chat.return_value = ChatResponse(message={"role": "assistant", "content": '{"idade":60}'})
        third = send(client, session_id, "Corrigindo, tenho sessenta")
        assert third.json()["profile"]["idade"] == 60
        assert third.json()["analyses"][0]["status"] == "INCOMPATIVEL"


@pytest.mark.parametrize("content", [
    "não é JSON", "", '{"idade":-1}', '{"idade":"67"}',
    '{"renda_per_capita":100}', '{"direito_garantido":true}',
])
def test_invalid_output_does_not_change_session(monkeypatch, content):
    mock_chat(monkeypatch, content)
    with TestClient(create_app(Settings(llm_provider="ollama"))) as client:
        session = client.post("/api/sessions", json={}).json()
        response = send(client, session["session_id"], "Tenho 67 anos")
        assert response.status_code == 400
        assert client.get(f"/api/sessions/{session['session_id']}").json() == session


@pytest.mark.parametrize("error", [
    ConnectionError("private data"), httpx.ConnectError("private data"),
    httpx.ReadTimeout("private data"), TimeoutError("private data"),
    ResponseError("private data", status_code=404),
    ResponseError("private data", status_code=500),
])
def test_ollama_failure_returns_503_and_preserves_session(monkeypatch, error):
    mock_chat(monkeypatch, error=error)
    with TestClient(create_app(Settings(llm_provider="ollama"))) as client:
        session = client.post("/api/sessions", json={}).json()
        response = send(client, session["session_id"], "Tenho 67 anos")
        assert response.status_code == 503
        assert "private data" not in response.text
        assert client.get(f"/api/sessions/{session['session_id']}").json() == session


def test_ollama_environment_configuration(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "ollama")
    monkeypatch.setenv("OLLAMA_MODEL", "custom-model")
    monkeypatch.setenv("OLLAMA_TIMEOUT_SECONDS", "30")
    settings = get_settings()
    assert settings.llm_provider == "ollama"
    assert settings.ollama_model == "custom-model"
    assert settings.ollama_timeout_seconds == 30
