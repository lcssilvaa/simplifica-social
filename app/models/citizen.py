from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, computed_field

ProfileField = Literal[
    "idade",
    "renda_individual",
    "renda_familiar",
    "quantidade_pessoas_familia",
    "cadunico",
    "possui_deficiencia",
    "situacao_profissional",
    "possui_filhos",
    "quantidade_filhos",
    "cidade",
    "estado",
]
Money = Annotated[float, Field(ge=0, allow_inf_nan=False)]


class CitizenProfile(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, str_strip_whitespace=True)

    idade: Annotated[int, Field(ge=0, le=130)] | None = None
    renda_individual: Money | None = None
    renda_familiar: Money | None = None
    quantidade_pessoas_familia: Annotated[int, Field(ge=1, le=100)] | None = None
    cadunico: bool | None = None
    possui_deficiencia: bool | None = None
    situacao_profissional: Annotated[str, Field(min_length=1, max_length=80)] | None = (
        None
    )
    possui_filhos: bool | None = None
    quantidade_filhos: Annotated[int, Field(ge=0, le=100)] | None = None
    cidade: Annotated[str, Field(min_length=1, max_length=100)] | None = None
    estado: Annotated[str, Field(pattern=r"^[A-Z]{2}$")] | None = None

    @computed_field
    @property
    def renda_per_capita(self) -> float | None:
        """Valor de saída, sempre recalculado a partir dos dados da família."""
        if self.renda_familiar is None or self.quantidade_pessoas_familia is None:
            return None
        return float(
            Decimal(str(self.renda_familiar)) / self.quantidade_pessoas_familia
        )
