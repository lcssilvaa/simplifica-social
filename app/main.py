import asyncio
from contextlib import asynccontextmanager, suppress
from collections.abc import AsyncIterator

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, RedirectResponse

from app.api.routes import benefits, chat, health, sessions
from app.core.config import Settings, get_settings
from app.core.exceptions import DomainError
from app.repositories.benefit_repository import JsonBenefitRepository
from app.repositories.session_repository import InMemorySessionRepository
from app.services.benefit_service import BenefitService
from app.services.chat_service import ChatService
from app.services.eligibility_service import EligibilityService
from app.services.llm_service import LLMProvider, LLMService, MockLLMProvider
from app.services.ollama_provider import OllamaLLMProvider


def create_app(
    settings: Settings | None = None, provider: LLMProvider | None = None
) -> FastAPI:
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(application: FastAPI) -> AsyncIterator[None]:
        repository = InMemorySessionRepository(
            settings.session_ttl_seconds, settings.max_sessions
        )
        benefit_service = BenefitService(JsonBenefitRepository(settings.benefits_path))
        application.state.settings = settings
        application.state.sessions = repository
        application.state.benefit_service = benefit_service
        selected_provider = provider
        if selected_provider is None:
            selected_provider = (
                OllamaLLMProvider(
                    host=settings.ollama_host,
                    model=settings.ollama_model,
                    timeout=settings.ollama_timeout_seconds,
                )
                if settings.llm_provider == "ollama"
                else MockLLMProvider()
            )
        application.state.chat_service = ChatService(
            repository,
            benefit_service,
            EligibilityService(),
            LLMService(selected_provider),
            settings.max_messages_per_session,
        )

        async def cleanup_sessions() -> None:
            while True:
                await asyncio.sleep(min(settings.session_ttl_seconds, 60))
                repository.purge_expired()

        cleanup = asyncio.create_task(cleanup_sessions())
        try:
            yield
        finally:
            cleanup.cancel()
            with suppress(asyncio.CancelledError):
                await cleanup

    application = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        lifespan=lifespan,
        description="MVP acadêmico com análise preliminar e exemplos fictícios identificados. Nenhuma análise confirma direito a benefício.",
    )

    @application.exception_handler(DomainError)
    async def domain_error_handler(
        request: Request, error: DomainError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=error.status_code, content={"detail": str(error)}
        )

    @application.exception_handler(RequestValidationError)
    async def validation_error_handler(
        request: Request, error: RequestValidationError
    ) -> JSONResponse:
        # Não devolver a mensagem pessoal recebida dentro dos erros de validação.
        return JSONResponse(
            status_code=422,
            content={
                "detail": [
                    {"loc": item["loc"], "msg": item["msg"], "type": item["type"]}
                    for item in error.errors()
                ]
            },
        )

    @application.get("/", include_in_schema=False)
    async def root() -> RedirectResponse:
        return RedirectResponse("/docs")

    for router in (health.router, sessions.router, chat.router, benefits.router):
        application.include_router(router)
    return application


app = create_app()
