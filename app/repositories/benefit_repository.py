from pathlib import Path
from typing import Protocol

from pydantic import TypeAdapter

from app.core.exceptions import BenefitNotFound
from app.models.benefit import Benefit


class BenefitRepository(Protocol):
    def list_all(self) -> list[Benefit]: ...
    def get(self, codigo: str) -> Benefit: ...


class JsonBenefitRepository:
    def __init__(self, path: Path) -> None:
        benefits = TypeAdapter(list[Benefit]).validate_json(
            path.read_text(encoding="utf-8")
        )
        self._benefits = {benefit.codigo: benefit for benefit in benefits}
        if len(self._benefits) != len(benefits):
            raise ValueError("O catálogo contém códigos de benefício duplicados.")

    def list_all(self) -> list[Benefit]:
        return [benefit.model_copy(deep=True) for benefit in self._benefits.values()]

    def get(self, codigo: str) -> Benefit:
        if codigo not in self._benefits:
            raise BenefitNotFound()
        return self._benefits[codigo].model_copy(deep=True)
