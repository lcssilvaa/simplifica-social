class DomainError(Exception):
    status_code = 400


class LLMUnavailable(DomainError):
    status_code = 503


class SessionNotFound(DomainError):
    status_code = 404

    def __init__(self) -> None:
        super().__init__("Sessão inexistente ou expirada. Inicie uma nova conversa.")


class BenefitNotFound(DomainError):
    status_code = 404

    def __init__(self) -> None:
        super().__init__("Benefício não encontrado.")


class ChannelMismatch(DomainError):
    status_code = 409

    def __init__(self) -> None:
        super().__init__("O canal informado não corresponde ao canal da sessão.")


class CapacityExceeded(DomainError):
    status_code = 503

    def __init__(self) -> None:
        super().__init__("Limite de sessões atingido. Tente novamente mais tarde.")
