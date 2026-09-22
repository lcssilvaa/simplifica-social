import asyncio
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app
from app.models.chat import Channel, ChatRequest
from app.repositories.session_repository import InMemorySessionRepository
from app.services.benefit_service import BenefitService
from app.services.chat_service import ChatService
from app.services.eligibility_service import EligibilityService
from app.services.llm_service import LLMService, MockLLMProvider


def send(client, session_id, message, channel="WEB"):
    return client.post(
        "/api/chat",
        json={"session_id": session_id, "channel": channel, "message": message},
    )


def test_conversation_keeps_context_and_answers_pending_question(client):
    session_id = client.post("/api/sessions", json={}).json()["session_id"]
    response = send(client, session_id, "Tenho 67 anos e moro sozinho")
    assert response.status_code == 200
    first = response.json()
    assert first["profile"]["idade"] == 67
    assert first["profile"]["quantidade_pessoas_familia"] == 1
    assert first["profile"]["renda_familiar"] is None
    assert first["possible_benefits"][0]["status"] == "POSSIVEL"
    assert first["missing_information"][0] == "renda_familiar"
    assert first["message"].endswith(first["questions"][0])

    second = send(client, session_id, "R$ 1.800,50").json()
    assert second["profile"]["renda_familiar"] == 1800.50
    assert second["profile"]["idade"] == 67
    assert second["missing_information"][0] == "cadunico"
    third = send(client, session_id, "Sim").json()
    senior = next(
        item
        for item in third["analyses"]
        if item["codigo"] == "DEMO_ACOLHIMENTO_SENIOR"
    )
    assert senior["status"] == "COMPATIVEL"
    assert "não confirma direito" in third["message"]
    assert "fictícios" in third["message"]
    session = client.get(f"/api/sessions/{session_id}").json()
    assert len(session["messages"]) == 6
    assert session["updated_at"] >= session["created_at"]


def test_isolation_between_sessions(client):
    first = client.post("/api/sessions", json={}).json()["session_id"]
    second = client.post("/api/sessions", json={}).json()["session_id"]
    send(client, first, "Tenho 67 anos")
    data = client.get(f"/api/sessions/{second}").json()
    assert data["citizen_profile"]["idade"] is None
    assert data["messages"] == []


def test_missing_session(client):
    assert send(client, str(uuid4()), "Olá").status_code == 404


def test_channel_mismatch_does_not_modify_session(client):
    session = client.post("/api/sessions", json={}).json()
    assert (
        send(client, session["session_id"], "Tenho 67 anos", "WHATSAPP").status_code
        == 409
    )
    assert client.get(f"/api/sessions/{session['session_id']}").json() == session


def test_whatsapp_uses_same_core_without_integration(client):
    session = client.post("/api/sessions", json={"channel": "WHATSAPP"}).json()
    response = send(client, session["session_id"], "Tenho 67 anos", "WHATSAPP")
    assert response.status_code == 200
    assert response.json()["profile"]["idade"] == 67


@pytest.mark.parametrize("message", ["", "   ", "x" * 2001, 123, None])
def test_invalid_messages(client, message):
    response = send(client, str(uuid4()), message)
    assert response.status_code == 422
    assert all("input" not in error for error in response.json()["detail"])


def test_unknown_text_preserves_existing_profile(client):
    session_id = client.post("/api/sessions", json={}).json()["session_id"]
    first = send(client, session_id, "Tenho 67 anos").json()
    second = send(client, session_id, "Não sei informar").json()
    assert second["profile"] == first["profile"]
    assert second["questions"][0] == first["questions"][0]


def test_correction_re_evaluates_results(client):
    session_id = client.post("/api/sessions", json={}).json()["session_id"]
    send(client, session_id, "Tenho 67 anos")
    response = send(client, session_id, "Corrigindo, tenho 60 anos").json()
    assert response["profile"]["idade"] == 60
    assert response["analyses"][0]["status"] == "INCOMPATIVEL"


def test_correction_of_children_does_not_keep_conflicting_count(client):
    session_id = client.post("/api/sessions", json={}).json()["session_id"]
    send(client, session_id, "Não tenho filhos")
    response = send(client, session_id, "Corrigindo, tenho filhos").json()
    assert response["profile"]["possui_filhos"] is True
    assert response["profile"]["quantidade_filhos"] is None


def test_invalid_extracted_value_does_not_change_session(client):
    session = client.post("/api/sessions", json={}).json()
    assert send(client, session["session_id"], "Tenho 999 anos").status_code == 400
    assert client.get(f"/api/sessions/{session['session_id']}").json() == session


def test_message_retention_limit():
    with TestClient(create_app(Settings(max_messages_per_session=2))) as client:
        session_id = client.post("/api/sessions", json={}).json()["session_id"]
        send(client, session_id, "Tenho 67 anos")
        send(client, session_id, "1800")
        session = client.get(f"/api/sessions/{session_id}").json()
        assert len(session["messages"]) == 2
        assert session["citizen_profile"]["idade"] == 67


def test_concurrent_messages_keep_both_updates(catalog):
    class SlowProvider(MockLLMProvider):
        async def extract_information(self, message, profile, pending_field):
            await asyncio.sleep(0.01)
            return await super().extract_information(message, profile, pending_field)

    async def scenario():
        repository = InMemorySessionRepository(3600)
        session = repository.create(Channel.WEB)
        service = ChatService(
            repository,
            BenefitService(catalog),
            EligibilityService(),
            LLMService(SlowProvider()),
        )
        await asyncio.gather(
            *[
                service.send_message(
                    ChatRequest(session_id=session.session_id, message=message)
                )
                for message in ["Tenho 67 anos", "Renda familiar de 1800"]
            ]
        )
        result = repository.get(session.session_id)
        assert result.citizen_profile.idade == 67
        assert result.citizen_profile.renda_familiar == 1800
        assert len(result.messages) == 4

    asyncio.run(scenario())
