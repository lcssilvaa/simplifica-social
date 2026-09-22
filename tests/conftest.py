from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app
from app.repositories.benefit_repository import JsonBenefitRepository


@pytest.fixture
def client() -> Iterator[TestClient]:
    with TestClient(create_app(Settings())) as test_client:
        yield test_client


@pytest.fixture
def catalog() -> JsonBenefitRepository:
    return JsonBenefitRepository(Settings().benefits_path)
