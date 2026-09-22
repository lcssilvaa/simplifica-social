import re
import unicodedata
from typing import Protocol

from pydantic import ValidationError

from app.core.exceptions import DomainError
from app.models.benefit import BenefitAnalysis, EligibilityStatus
from app.models.citizen import CitizenProfile, ProfileField


class LLMProvider(Protocol):
    async def extract_information(
        self,
        message: str,
        profile: CitizenProfile,
        pending_field: ProfileField | None,
    ) -> CitizenProfile: ...

    async def generate_response(
        self,
        profile: CitizenProfile,
        analyses: list[BenefitAnalysis],
        questions: list[str],
    ) -> str: ...


class LLMService:
    def __init__(self, provider: LLMProvider) -> None:
        self.provider = provider

    async def extract_information(
        self,
        message: str,
        profile: CitizenProfile,
        pending_field: ProfileField | None,
    ) -> CitizenProfile:
        try:
            extracted = await self.provider.extract_information(
                message, profile.model_copy(deep=True), pending_field
            )
            return CitizenProfile.model_validate(
                extracted.model_dump(exclude_computed_fields=True)
            )
        except ValidationError:
            raise DomainError(
                "Não consegui validar os dados. Confira os valores informados."
            ) from None

    async def generate_response(
        self,
        profile: CitizenProfile,
        analyses: list[BenefitAnalysis],
        questions: list[str],
    ) -> str:
        return await self.provider.generate_response(
            profile.model_copy(deep=True),
            [item.model_copy(deep=True) for item in analyses],
            questions.copy(),
        )


def normalize(text: str) -> str:
    return "".join(
        char
        for char in unicodedata.normalize("NFD", text.lower())
        if unicodedata.category(char) != "Mn"
    )


def parse_money(value: str) -> float:
    return float(value.replace(".", "").replace(",", "."))


class MockLLMProvider:
    """Extrator limitado a padrões explícitos; não é um modelo de linguagem."""

    async def extract_information(
        self,
        message: str,
        profile: CitizenProfile,
        pending_field: ProfileField | None,
    ) -> CitizenProfile:
        text = normalize(message).strip()
        updates: dict[str, int | float | str | bool] = {}
        age = re.search(r"(?<!nao )\btenho (\d{1,3}) anos\b", text)
        if age:
            updates["idade"] = int(age[1])
        if re.search(r"\bmoro sozinh[oa]\b", text):
            updates["quantidade_pessoas_familia"] = 1
        family = re.search(r"\bsomos (\d+) pessoas\b", text)
        if family:
            updates["quantidade_pessoas_familia"] = int(family[1])
        # Morar com cônjuge não informa se existem outros moradores.
        amount = r"(\d+(?:\.\d{3})*(?:,\d{1,2})?)(?!\d|[.,]\d)"
        for label, field in [
            ("familiar", "renda_familiar"),
            ("individual", "renda_individual"),
        ]:
            match = re.search(
                rf"\brenda {label}\s*(?:e |de |: |:)?\s*(?:r\$\s*)?{amount}(?=\s|$|[.,;!?])",
                text,
            )
            if match:
                updates[field] = parse_money(match[1])
        for concept, field in [
            (r"(?:cadunico|cadastro unico)", "cadunico"),
            ("deficiencia", "possui_deficiencia"),
        ]:
            match = re.search(
                rf"\b(nao )?(?:tenho|possuo) (?:o |uma )?{concept}\b", text
            )
            if match:
                updates[field] = not bool(match[1])
        children = re.search(r"\btenho (\d+) filh[oa]s?\b", text)
        if children:
            updates["quantidade_filhos"] = int(children[1])
            updates["possui_filhos"] = int(children[1]) > 0
        elif re.search(r"\bnao tenho filhos\b", text):
            updates.update(possui_filhos=False, quantidade_filhos=0)
        elif re.search(r"\btenho filhos\b", text):
            updates["possui_filhos"] = True
        for pattern, value in [
            (r"\bestou desempregad[oa]\b", "desempregado"),
            (r"\bsou aposentad[oa]\b", "aposentado"),
            (r"\bsou autonom[oa]\b", "autonomo"),
            (r"\bestou empregad[oa]\b", "empregado"),
        ]:
            if re.search(pattern, text):
                updates["situacao_profissional"] = value
        location = re.search(r"\bmoro em ([^,.;!?/]+)[,/]\s*([a-z]{2})\b", text)
        if location:
            updates.update(
                cidade=location[1].strip().title(), estado=location[2].upper()
            )

        # Respostas curtas só são associadas à pergunta efetivamente apresentada.
        answer = text.rstrip(".!?").strip()
        if pending_field and pending_field not in updates:
            if pending_field in {"cadunico", "possui_deficiencia", "possui_filhos"}:
                if answer in {"sim", "nao"}:
                    updates[pending_field] = answer == "sim"
            elif pending_field in {"renda_familiar", "renda_individual"}:
                match = re.fullmatch(rf"(?:r\$\s*)?{amount}(?: reais)?", answer)
                if match:
                    updates[pending_field] = parse_money(match[1])
            elif pending_field in {
                "idade",
                "quantidade_pessoas_familia",
                "quantidade_filhos",
            }:
                match = re.fullmatch(r"(\d+)(?: anos| pessoas| filhos)?", answer)
                if match:
                    updates[pending_field] = int(match[1])
            elif pending_field == "estado" and re.fullmatch(r"[a-z]{2}", answer):
                updates[pending_field] = answer.upper()

        return CitizenProfile.model_validate(updates)

    async def generate_response(
        self,
        profile: CitizenProfile,
        analyses: list[BenefitAnalysis],
        questions: list[str],
    ) -> str:
        if any(not item.ficticio for item in analyses):
            parts = ["Esta é uma análise preliminar dos critérios cadastrados."]
            if any(item.ficticio for item in analyses):
                parts.append(
                    "O catálogo também contém exemplos fictícios, identificados pelo nome."
                )
        else:
            parts = ["Esta é uma demonstração acadêmica com benefícios fictícios."]
        if profile.renda_per_capita is not None:
            total = f"{profile.renda_familiar:.2f}".replace(".", ",")
            per_person = f"{profile.renda_per_capita:.2f}".replace(".", ",")
            parts.append(
                f"Renda mensal por pessoa: R$ {total} ÷ {profile.quantidade_pessoas_familia} "
                f"= aproximadamente R$ {per_person}. A comparação usa o valor sem arredondamento."
            )
        candidates = [
            item
            for item in analyses
            if item.status
            in {
                EligibilityStatus.COMPATIVEL,
                EligibilityStatus.POSSIVEL,
            }
        ]
        if candidates:
            parts.append(
                "Com base nas informações fornecidas, há possível enquadramento nos itens abaixo:"
            )
            for item in candidates:
                parts.append(
                    f"{item.beneficio}: pode atender aos critérios de {', '.join(item.criterios_atendidos)}."
                )
                if item.criterios_pendentes:
                    parts.append(
                        f"Precisa ser confirmado: {', '.join(item.criterios_pendentes)}."
                    )
                parts.extend(item.proximos_passos)
                if item.condicionalidades:
                    parts.append(
                        "Outras condições a confirmar: "
                        + " ".join(item.condicionalidades)
                    )
                if item.fonte_oficial:
                    parts.append(f"Fonte oficial: {item.fonte_oficial}")
        elif any(
            item.status == EligibilityStatus.INFORMACOES_INSUFICIENTES
            for item in analyses
        ):
            parts.append(
                "Ainda preciso de informações para comparar seu perfil com os critérios cadastrados."
            )
        else:
            parts.append(
                "Os dados informados não correspondem aos critérios cadastrados. Isso não determina acesso a benefícios reais."
            )
        parts.append("Esta análise não confirma direito a benefício.")
        if questions:
            parts.append(questions[0])
        return " ".join(parts)
