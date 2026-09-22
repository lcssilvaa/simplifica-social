import json

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.core.config import Settings
from app.main import create_app
from app.models.benefit import Criterion
from app.models.citizen import CitizenProfile
from app.services.eligibility_service import EligibilityService


@pytest.mark.parametrize(
    ("income", "people", "status"),
    [
        (600, 3, "COMPATIVEL"),
        (654, 3, "COMPATIVEL"),
        (654.01, 3, "INCOMPATIVEL"),
        (900, 3, "INCOMPATIVEL"),
        (0, 1, "COMPATIVEL"),
        (218, 1, "COMPATIVEL"),
    ],
)
def test_per_capita_threshold_without_rounding(catalog, income, people, status):
    profile = CitizenProfile(
        renda_familiar=income, quantidade_pessoas_familia=people, cadunico=True
    )
    result = EligibilityService().evaluate(profile, catalog.get("BOLSA_FAMILIA"))
    assert result.status == status
    assert profile.model_dump()["renda_per_capita"] == pytest.approx(income / people)


@pytest.mark.parametrize(
    ("data", "missing"),
    [
        ({}, ["renda_familiar", "quantidade_pessoas_familia", "cadunico"]),
        ({"renda_familiar": 600}, ["quantidade_pessoas_familia", "cadunico"]),
        ({"quantidade_pessoas_familia": 3}, ["renda_familiar", "cadunico"]),
        ({"renda_familiar": 0}, ["quantidade_pessoas_familia", "cadunico"]),
    ],
)
def test_unknown_components_generate_input_questions(catalog, data, missing):
    profile = CitizenProfile(**data)
    result = EligibilityService().evaluate(profile, catalog.get("BOLSA_FAMILIA"))
    assert profile.renda_per_capita is None
    assert result.status == "INFORMACOES_INSUFICIENTES"
    assert result.campos_pendentes == missing
    assert len(result.perguntas) == len(missing)
    assert "renda_per_capita" not in result.campos_pendentes


@pytest.mark.parametrize("value", [0, -1, True, 1.5])
def test_invalid_family_size(value):
    with pytest.raises(ValidationError):
        CitizenProfile(quantidade_pessoas_familia=value)


def test_per_capita_cannot_be_supplied_as_profile_input():
    with pytest.raises(ValidationError):
        CitizenProfile(
            renda_familiar=900, quantidade_pessoas_familia=3, renda_per_capita=100
        )


@pytest.mark.parametrize("value", [True, "218", -1, float("inf")])
def test_invalid_per_capita_rule(value):
    with pytest.raises(ValidationError):
        Criterion(
            campo="renda_per_capita",
            operador="<=",
            valor=value,
            descricao="Renda",
            pergunta="Renda total?",
        )


@pytest.fixture
def bolsa_client(tmp_path, catalog):
    path = tmp_path / "bolsa.json"
    path.write_text(
        json.dumps([catalog.get("BOLSA_FAMILIA").model_dump(mode="json")]),
        encoding="utf-8",
    )
    with TestClient(create_app(Settings(benefits_path=path))) as client:
        yield client


def test_income_then_people_then_cadunico_and_corrections(bolsa_client):
    client = bolsa_client
    session_id = client.post("/api/sessions", json={}).json()["session_id"]

    def send(message):
        response = client.post(
            "/api/chat", json={"session_id": session_id, "message": message}
        )
        assert response.status_code == 200
        return response.json()

    first = send("Gostaria de saber quais benefícios posso verificar")
    assert first["missing_information"][0] == "renda_familiar"
    assert "renda mensal total" in first["questions"][0]
    second = send("600")
    assert second["profile"]["renda_familiar"] == 600
    assert second["profile"]["renda_per_capita"] is None
    assert second["missing_information"][0] == "quantidade_pessoas_familia"
    assert "incluindo você" in second["questions"][0]
    invalid = client.post("/api/chat", json={"session_id": session_id, "message": "0"})
    assert invalid.status_code == 400
    third = send("3 pessoas")
    assert third["profile"]["renda_per_capita"] == 200
    assert third["missing_information"] == ["cadunico"]
    assert "R$ 600,00 ÷ 3" in third["message"]
    final = send("Sim")
    assert final["analyses"][0]["status"] == "COMPATIVEL"
    assert final["missing_information"] == []
    assert "não confirma direito" in final["message"]
    assert "Fonte oficial:" in final["message"]
    assert "Outras condições a confirmar:" in final["message"]
    assert "benefícios fictícios" not in final["message"]

    corrected = send("Corrigindo, somos 2 pessoas")
    assert corrected["profile"]["renda_per_capita"] == 300
    assert corrected["analyses"][0]["status"] == "INCOMPATIVEL"
    corrected_income = send("Renda familiar de 400")
    assert corrected_income["profile"]["renda_per_capita"] == 200
    assert corrected_income["analyses"][0]["status"] == "COMPATIVEL"
    stored = client.get(f"/api/sessions/{session_id}").json()
    assert stored["citizen_profile"]["renda_per_capita"] == 200


def test_known_family_size_skips_question(bolsa_client):
    session_id = bolsa_client.post("/api/sessions", json={}).json()["session_id"]
    first = bolsa_client.post(
        "/api/chat", json={"session_id": session_id, "message": "Somos 3 pessoas"}
    ).json()
    assert first["missing_information"] == ["renda_familiar", "cadunico"]
    second = bolsa_client.post(
        "/api/chat", json={"session_id": session_id, "message": "654"}
    ).json()
    assert second["profile"]["renda_per_capita"] == 218
    assert second["missing_information"] == ["cadunico"]
