from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.dependencies import get_benefit_service
from app.models.benefit import Benefit
from app.services.benefit_service import BenefitService

router = APIRouter(prefix="/api/benefits", tags=["Benefícios"])
Service = Annotated[BenefitService, Depends(get_benefit_service)]


@router.get("", response_model=list[Benefit])
async def list_benefits(service: Service) -> list[Benefit]:
    return service.list_all()


@router.get("/{codigo}", response_model=Benefit)
async def get_benefit(codigo: str, service: Service) -> Benefit:
    return service.get(codigo)
