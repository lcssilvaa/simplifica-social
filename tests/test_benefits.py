import json

import pytest
from pydantic import ValidationError

from app.repositories.benefit_repository import JsonBenefitRepository


def test_catalog_endpoints(client):
    response = client.get("/api/benefits")
    assert response.status_code == 200
    benefits = response.json()
    assert len(benefits) == 4
    demos = [item for item in benefits if item["ficticio"]]
    assert len(demos) == 3
    assert all(item["fonte_oficial"] is None for item in demos)
    official = next(item for item in benefits if item["codigo"] == "BOLSA_FAMILIA")
    assert official["ficticio"] is False
    assert official["fonte_oficial"].startswith("https://www.gov.br/mds/")
    assert len(official["condicionalidades"]) == 3
    for benefit in benefits:
        assert client.get(f"/api/benefits/{benefit['codigo']}").json() == benefit
    assert client.get("/api/benefits/MISSING").status_code == 404


def test_duplicate_codes_fail_at_load(tmp_path, catalog):
    benefit = catalog.list_all()[0].model_dump(mode="json")
    path = tmp_path / "benefits.json"
    path.write_text(json.dumps([benefit, benefit]), encoding="utf-8")
    with pytest.raises(ValueError, match="duplicados"):
        JsonBenefitRepository(path)


def test_bad_rules_fail_at_load(tmp_path, catalog):
    benefit = catalog.list_all()[0].model_dump(mode="json")
    benefit["criterios"][0]["campo"] = "cpf"
    path = tmp_path / "benefits.json"
    path.write_text(json.dumps([benefit]), encoding="utf-8")
    with pytest.raises(ValidationError):
        JsonBenefitRepository(path)


def test_catalog_returns_independent_copies(catalog):
    benefit = catalog.get("DEMO_ACOLHIMENTO_SENIOR")
    benefit.criterios.clear()
    assert len(catalog.get(benefit.codigo).criterios) == 3
