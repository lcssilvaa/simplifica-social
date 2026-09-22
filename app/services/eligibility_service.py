import operator
from decimal import Decimal

from app.models.benefit import Benefit, BenefitAnalysis, EligibilityStatus
from app.models.citizen import CitizenProfile, ProfileField

PER_CAPITA_QUESTIONS: dict[ProfileField, str] = {
    "renda_familiar": "Qual é a renda mensal total da sua família, em reais?",
    "quantidade_pessoas_familia": "Quantas pessoas fazem parte da sua família, incluindo você?",
}

OPERATORS = {
    ">=": operator.ge,
    "<=": operator.le,
    ">": operator.gt,
    "<": operator.lt,
    "==": operator.eq,
    "!=": operator.ne,
}


class EligibilityService:
    def evaluate(self, profile: CitizenProfile, benefit: Benefit) -> BenefitAnalysis:
        met, unmet, pending, fields, questions = [], [], [], [], []
        for criterion in benefit.criterios:
            value = getattr(profile, criterion.campo)
            target = criterion.valor
            if value is None:
                pending.append(criterion.descricao)
                if criterion.campo == "renda_per_capita":
                    for field, question in PER_CAPITA_QUESTIONS.items():
                        if getattr(profile, field) is None and field not in fields:
                            fields.append(field)
                            questions.append(question)
                elif criterion.campo not in fields:
                    fields.append(criterion.campo)
                    questions.append(criterion.pergunta)
                continue
            if criterion.campo == "renda_per_capita":
                # Comparar o total evita arredondar a divisão antes da decisão.
                value = Decimal(str(profile.renda_familiar))
                target = (
                    Decimal(str(criterion.valor)) * profile.quantidade_pessoas_familia
                )
            if OPERATORS[criterion.operador](value, target):
                met.append(criterion.descricao)
            else:
                unmet.append(criterion.descricao)

        if unmet:
            status = EligibilityStatus.INCOMPATIVEL
        elif not pending:
            status = EligibilityStatus.COMPATIVEL
        elif met:
            status = EligibilityStatus.POSSIVEL
        else:
            status = EligibilityStatus.INFORMACOES_INSUFICIENTES

        return BenefitAnalysis(
            codigo=benefit.codigo,
            beneficio=benefit.nome,
            ficticio=benefit.ficticio,
            status=status,
            criterios_atendidos=met,
            criterios_nao_atendidos=unmet,
            criterios_pendentes=pending,
            campos_pendentes=fields,
            perguntas=questions,
            proximos_passos=benefit.proximos_passos,
            fonte_oficial=benefit.fonte_oficial,
            condicionalidades=benefit.condicionalidades,
        )
