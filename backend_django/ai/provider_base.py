from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
from dataclasses import dataclass, field


@dataclass
class AIResponse:
    """
    Standardized internal data contract returned by all AI providers.
    Ensures decoupled model invocation, unified telemetry, and token tracking.
    """
    content: str
    provider: str
    model: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    execution_time_ms: int = 0
    raw_metadata: Dict[str, Any] = field(default_factory=dict)


class AIProviderException(Exception):
    """Base exception for all AI provider errors."""
    pass


class AIProviderNotConfiguredError(AIProviderException):
    """Raised when no AI API key or provider is configured."""
    pass


class AIProviderAuthenticationError(AIProviderException):
    """Raised when provider credentials are invalid, rejected, or missing permissions."""
    pass


class AIProviderRateLimitError(AIProviderException):
    """Raised when upstream provider quota or rate limit is reached (HTTP 429). Retriable."""
    pass


class AIProviderTimeoutError(AIProviderException):
    """Raised when request to AI provider times out. Retriable."""
    pass


class AIProviderServiceUnavailableError(AIProviderException):
    """Raised when upstream provider experiences server outage or 5xx errors. Retriable."""
    pass


class AIProviderContextLengthError(AIProviderException):
    """Raised when input text exceeds model context window limit. Non-retriable."""
    pass


class AIProviderInvalidRequestError(AIProviderException):
    """Raised when request syntax or prompt structure is malformed (HTTP 400). Non-retriable."""
    pass


class BaseAIProvider(ABC):
    """
    Abstract base class for all hosted and local AI completion providers.
    Ensures decoupled model invocation, credential safety, and unified exception handling.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Provider identifier (e.g. 'deepseek', 'gemini', 'mock')."""
        pass

    @property
    @abstractmethod
    def model(self) -> str:
        """Model identifier (e.g. 'deepseek-chat', 'gemini-2.5-flash')."""
        pass

    @abstractmethod
    def generate_response(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: int = 1500,
        temperature: float = 0.3
    ) -> AIResponse:
        """
        Generates structured AIResponse for a given user prompt and optional system prompt.
        Must handle timeouts, retries, token counting, and map provider errors.
        """
        pass

    def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: int = 1500,
        temperature: float = 0.3
    ) -> str:
        """
        Backward-compatible helper returning raw text content.
        Delegates directly to generate_response().
        """
        response = self.generate_response(
            prompt=prompt,
            system_prompt=system_prompt,
            max_tokens=max_tokens,
            temperature=temperature
        )
        return response.content
