from enum import StrEnum
from typing import Literal, Self

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, TypeAdapter, model_validator

from app.models.citizen import CitizenProfile, Money, ProfileField


class Criterion(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    campo: ProfileField | Literal["renda_per_capita"]
    operador: Literal[">=", "<=", ">", "<", "==", "!="]
    valor: int | float | bool | str
    descricao: str = Field(min_length=1)
    pergunta: str = Field(min_length=1)

    @model_validator(mode="after")
    def validate_comparison(self) -> Self:
        if self.campo == "renda_per_capita":
            TypeAdapter(Money).validate_python(self.valor, strict=True)
        else:
            CitizenProfile.model_validate({self.campo: self.valor})
        if self.operador not in {"==", "!="} and type(self.valor) not in {int, float}:
            raise ValueError("Comparações de ordem exigem um campo numérico.")
        return self


class Benefit(BaseModel):
    model_config = ConfigDict(extra="forbid")

    codigo: str = Field(pattern=r"^[A-Z][A-Z0-9_]+$")
    nome: str = Field(min_length=1)
    descricao: str = Field(min_length=1)
    abrangencia: Literal["federal", "estadual", "municipal", "demonstracao"]
    ficticio: bool = True
    criterios: list[Criterion] = Field(min_length=1)
    documentos: list[str] = Field(default_factory=list)
    condicionalidades: list[str] = Field(default_factory=list)
    proximos_passos: list[str] = Field(default_factory=list)
    fonte_oficial: HttpUrl | None = None


class EligibilityStatus(StrEnum):
    COMPATIVEL = "COMPATIVEL"
    POSSIVEL = "POSSIVEL"
    INCOMPATIVEL = "INCOMPATIVEL"
    INFORMACOES_INSUFICIENTES = "INFORMACOES_INSUFICIENTES"


class BenefitAnalysis(BaseModel):
    codigo: str
    beneficio: str
    ficticio: bool
    status: EligibilityStatus
    criterios_atendidos: list[str]
    criterios_nao_atendidos: list[str]
    criterios_pendentes: list[str]
    campos_pendentes: list[ProfileField]
    perguntas: list[str]
    proximos_passos: list[str]
    fonte_oficial: HttpUrl | None
    condicionalidades: list[str] = Field(default_factory=list)
