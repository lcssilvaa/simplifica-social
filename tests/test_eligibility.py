import pytest
from pydantic import ValidationError

from app.models.benefit import Criterion
from app.models.citizen import CitizenProfile
from app.services.eligibility_service import EligibilityService


@pytest.mark.parametrize(
    ("profile", "status", "met", "unmet", "pending"),
    [
        (
            {"idade": 65, "renda_familiar": 2000, "cadunico": True},
            "COMPATIVEL",
            3,
            0,
            0,
        ),
        ({"idade": 64}, "INCOMPATIVEL", 0, 1, 2),
        ({"idade": 67}, "POSSIVEL", 1, 0, 2),
        ({}, "INFORMACOES_INSUFICIENTES", 0, 0, 3),
        (
            {"idade": 67, "renda_familiar": 0, "cadunico": False},
            "INCOMPATIVEL",
            2,
            1,
            0,
        ),
        ({"idade": 67, "renda_familiar": 2000.01}, "INCOMPATIVEL", 1, 1, 1),
    ],
)
def test_multiple_criteria(catalog, profile, status, met, unmet, pending):
    result = EligibilityService().evaluate(
        CitizenProfile(**profile), catalog.get("DEMO_ACOLHIMENTO_SENIOR")
    )
    assert result.status == status
    assert len(result.criterios_atendidos) == met
    assert len(result.criterios_nao_atendidos) == unmet
    assert len(result.criterios_pendentes) == pending
    assert len(result.perguntas) == pending


@pytest.mark.parametrize(
    ("operator", "age", "expected"),
    [
        (">", 65, "INCOMPATIVEL"),
        (">", 66, "COMPATIVEL"),
        ("<", 64, "COMPATIVEL"),
        ("<", 65, "INCOMPATIVEL"),
        ("==", 65, "COMPATIVEL"),
        ("!=", 65, "INCOMPATIVEL"),
    ],
)
def test_operators(catalog, operator, age, expected):
    benefit = catalog.get("DEMO_ACOLHIMENTO_SENIOR")
    benefit.criterios = [
        Criterion(
            campo="idade",
            operador=operator,
            valor=65,
            descricao="Idade",
            pergunta="Qual sua idade?",
        )
    ]
    assert (
        EligibilityService().evaluate(CitizenProfile(idade=age), benefit).status
        == expected
    )


@pytest.mark.parametrize(
    "criterion",
    [
        {"campo": "inexistente", "operador": "==", "valor": 1},
        {"campo": "idade", "operador": "eval", "valor": 65},
        {"campo": "idade", "operador": ">=", "valor": "65"},
        {"campo": "idade", "operador": "==", "valor": True},
        {"campo": "cadunico", "operador": ">=", "valor": True},
        {"campo": "renda_familiar", "operador": "<=", "valor": float("inf")},
    ],
)
def test_invalid_criteria_rejected(criterion):
    with pytest.raises(ValidationError):
        Criterion(**criterion, descricao="Teste", pergunta="Teste?")
