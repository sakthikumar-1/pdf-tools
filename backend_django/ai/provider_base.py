from abc import ABC, abstractmethod
from typing import Optional, Dict, Any


class AIProviderException(Exception):
    """Base exception for all AI provider errors."""
    pass


class AIProviderNotConfiguredError(AIProviderException):
    """Raised when no AI API key or provider is configured."""
    pass


class AIProviderAuthenticationError(AIProviderException):
    """Raised when provider credentials are invalid or rejected."""
    pass


class AIProviderRateLimitError(AIProviderException):
    """Raised when upstream provider quota or rate limit is reached."""
    pass


class AIProviderTimeoutError(AIProviderException):
    """Raised when request to AI provider times out."""
    pass


class AIProviderContextLengthError(AIProviderException):
    """Raised when input text exceeds model context window limit."""
    pass


class BaseAIProvider(ABC):
    """
    Abstract base class for all hosted and local AI completion providers.
    Ensures decoupled model invocation, credential safety, and unified exception handling.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Provider identifier (e.g. 'openai', 'gemini', 'mock')."""
        pass

    @property
    @abstractmethod
    def model(self) -> str:
        """Model identifier (e.g. 'gpt-4o-mini', 'gemini-1.5-flash')."""
        pass

    @abstractmethod
    def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: int = 1500,
        temperature: float = 0.3
    ) -> str:
        """
        Generates text completion for a given user prompt and optional system prompt.
        Must handle timeouts, retries, and map provider-specific errors to AIProviderException subclasses.
        """
        pass
