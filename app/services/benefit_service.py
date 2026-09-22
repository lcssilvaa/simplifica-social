from app.models.benefit import Benefit
from app.repositories.benefit_repository import BenefitRepository


class BenefitService:
    def __init__(self, repository: BenefitRepository) -> None:
        self.repository = repository

    def list_all(self) -> list[Benefit]:
        return self.repository.list_all()

    def get(self, codigo: str) -> Benefit:
        return self.repository.get(codigo)
