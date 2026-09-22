from app.core.exceptions import ChannelMismatch
from app.models.benefit import EligibilityStatus
from app.models.chat import ChatRequest, ChatResponse, Message
from app.models.citizen import CitizenProfile, ProfileField
from app.repositories.session_repository import SessionRepository
from app.services.benefit_service import BenefitService
from app.services.eligibility_service import EligibilityService
from app.services.llm_service import LLMService


class ChatService:
    def __init__(
        self,
        sessions: SessionRepository,
        benefits: BenefitService,
        eligibility: EligibilityService,
        llm: LLMService,
        max_messages: int = 100,
    ) -> None:
        self.sessions = sessions
        self.benefits = benefits
        self.eligibility = eligibility
        self.llm = llm
        self.max_messages = max_messages

    async def send_message(self, request: ChatRequest) -> ChatResponse:
        async with self.sessions.transaction(request.session_id):
            session = self.sessions.get(request.session_id)
            if session.channel != request.channel:
                raise ChannelMismatch()
            extracted = await self.llm.extract_information(
                request.message,
                session.citizen_profile,
                session.pending_field,
            )
            profile_data = session.citizen_profile.model_dump(
                exclude_computed_fields=True
            )
            updates = extracted.model_dump(
                exclude_none=True, exclude_computed_fields=True
            )
            profile_data.update(updates)
            if "possui_filhos" in updates and "quantidade_filhos" not in updates:
                if updates["possui_filhos"] is False:
                    profile_data["quantidade_filhos"] = 0
                elif profile_data["quantidade_filhos"] == 0:
                    profile_data["quantidade_filhos"] = None
            session.citizen_profile = CitizenProfile.model_validate(profile_data)
            analyses = [
                self.eligibility.evaluate(session.citizen_profile, benefit)
                for benefit in self.benefits.list_all()
            ]
            candidates = [
                item
                for item in analyses
                if item.status
                in {
                    EligibilityStatus.COMPATIVEL,
                    EligibilityStatus.POSSIVEL,
                }
            ]
            relevant = [
                item
                for item in analyses
                if item.status != EligibilityStatus.INCOMPATIVEL
            ]
            relevant.sort(
                key=lambda item: item.status
                == EligibilityStatus.INFORMACOES_INSUFICIENTES
            )
            pending: dict[ProfileField, str] = {}
            for item in relevant:
                for field, question in zip(
                    item.campos_pendentes, item.perguntas, strict=True
                ):
                    pending.setdefault(field, question)
            questions = list(pending.values())
            message = await self.llm.generate_response(
                session.citizen_profile, analyses, questions
            )
            session.pending_field = next(iter(pending), None)
            session.messages.extend(
                [
                    Message(role="user", content=request.message),
                    Message(role="assistant", content=message),
                ]
            )
            session.messages = session.messages[-self.max_messages :]
            self.sessions.save(session)
            return ChatResponse(
                session_id=session.session_id,
                message=message,
                profile=session.citizen_profile,
                possible_benefits=candidates,
                analyses=analyses,
                missing_information=list(pending),
                questions=questions,
            )
