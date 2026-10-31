"""
Centralized AI Provider Router with Intelligent Circuit-Breaker Fallback.
Primary: DeepSeek API (deepseek-chat)
Secondary: Google Gemini API (gemini-2.5-flash)
Test/Offline: MockAIProvider

Handles automatic failover for 429 rate limits, 5xx server outages, and timeouts.
Ensures zero duplicate billing and safe non-retriable fast failures.
"""

import os
import sys
import time
import logging
from typing import Optional, Tuple, Dict, Any
from threading import Lock
from django.conf import settings

from .provider_base import (
    BaseAIProvider,
    AIResponse,
    AIProviderException,
    AIProviderNotConfiguredError,
    AIProviderAuthenticationError,
    AIProviderRateLimitError,
    AIProviderTimeoutError,
    AIProviderServiceUnavailableError,
    AIProviderContextLengthError,
    AIProviderInvalidRequestError
)
from .deepseek_provider import DeepSeekProvider
from .gemini_provider import GeminiProvider
from .mock_provider import MockAIProvider

logger = logging.getLogger(__name__)


class CircuitBreaker:
    """
    In-memory rolling-window circuit breaker for upstream AI providers.
    Trips when failure threshold is breached, preventing repeated timeout delays.
    """

    def __init__(self, failure_threshold: int = 3, recovery_time_seconds: float = 180.0):
        self.failure_threshold = failure_threshold
        self.recovery_time_seconds = recovery_time_seconds
        self._failure_count = 0
        self._last_failure_time = 0.0
        self._state = "CLOSED"  # CLOSED (healthy), OPEN (tripped), HALF_OPEN (probing)
        self._lock = Lock()

    @property
    def is_open(self) -> bool:
        with self._lock:
            if self._state == "OPEN":
                if time.time() - self._last_failure_time > self.recovery_time_seconds:
                    self._state = "HALF_OPEN"
                    logger.info("[CircuitBreaker] Primary provider entering HALF_OPEN state (probing single request).")
                    return False
                return True
            return False

    def record_success(self) -> None:
        with self._lock:
            self._failure_count = 0
            self._state = "CLOSED"

    def record_failure(self) -> None:
        with self._lock:
            self._failure_count += 1
            self._last_failure_time = time.time()
            if self._failure_count >= self.failure_threshold:
                self._state = "OPEN"
                logger.warning(
                    f"[CircuitBreaker] Primary provider tripped OPEN after {self._failure_count} consecutive failures. "
                    f"Routing directly to fallback provider for {self.recovery_time_seconds}s."
                )

    def reset(self) -> None:
        with self._lock:
            self._failure_count = 0
            self._last_failure_time = 0.0
            self._state = "CLOSED"


class AIProviderRouter(BaseAIProvider):
    """
    Centralized Router implementing unified multi-provider execution.
    Subclasses BaseAIProvider to allow drop-in substitution anywhere in the platform.
    """

    def __init__(
        self,
        primary_provider: Optional[BaseAIProvider] = None,
        secondary_provider: Optional[BaseAIProvider] = None,
        force_mock: bool = False
    ):
        self._primary = primary_provider
        self._secondary = secondary_provider
        self._force_mock = force_mock
        self._circuit_breaker = CircuitBreaker()

    @property
    def name(self) -> str:
        return "router"

    @property
    def model(self) -> str:
        primary = self._get_primary_provider()
        return primary.model if primary else "auto"

    def _is_testing_environment(self) -> bool:
        if self._force_mock:
            return True
        is_testing = (
            getattr(settings, 'IS_TESTING', False)
            or ('test' in sys.argv)
            or os.getenv('DJANGO_TESTING', '').lower() in ('1', 'true')
        )
        explicit_provider = getattr(settings, 'AI_PROVIDER', None) or os.getenv('AI_PROVIDER', '')
        return is_testing and explicit_provider.lower() != 'live'

    def _get_primary_provider(self) -> Optional[BaseAIProvider]:
        if self._primary is not None:
            return self._primary

        if self._is_testing_environment():
            return MockAIProvider()

        # Check explicit configuration override
        pref = (getattr(settings, 'AI_PROVIDER', None) or os.getenv('AI_PROVIDER', '')).lower().strip()
        if pref == 'gemini':
            try:
                return GeminiProvider()
            except AIProviderNotConfiguredError:
                pass

        # Default Primary: DeepSeek
        deepseek_key = getattr(settings, 'DEEPSEEK_API_KEY', None) or os.getenv('DEEPSEEK_API_KEY')
        if deepseek_key and deepseek_key.strip():
            try:
                return DeepSeekProvider()
            except AIProviderNotConfiguredError:
                pass

        # If DeepSeek not configured, try Gemini as primary
        gemini_key = getattr(settings, 'GEMINI_API_KEY', None) or os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY')
        if gemini_key and gemini_key.strip():
            try:
                return GeminiProvider()
            except AIProviderNotConfiguredError:
                pass

        return None

    def _get_secondary_provider(self) -> Optional[BaseAIProvider]:
        if self._secondary is not None:
            return self._secondary

        if self._is_testing_environment():
            return None

        # If primary is DeepSeek, secondary is Gemini
        primary = self._get_primary_provider()
        if primary and primary.name == 'deepseek':
            gemini_key = getattr(settings, 'GEMINI_API_KEY', None) or os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY')
            if gemini_key and gemini_key.strip():
                try:
                    return GeminiProvider()
                except AIProviderNotConfiguredError:
                    pass

        # If primary is Gemini, secondary is DeepSeek
        if primary and primary.name == 'gemini':
            deepseek_key = getattr(settings, 'DEEPSEEK_API_KEY', None) or os.getenv('DEEPSEEK_API_KEY')
            if deepseek_key and deepseek_key.strip():
                try:
                    return DeepSeekProvider()
                except AIProviderNotConfiguredError:
                    pass

        return None

    def execute(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: int = 1500,
        temperature: float = 0.3
    ) -> Tuple[AIResponse, bool]:
        """
        Executes AI completion with automatic fallback.
        Returns: Tuple[AIResponse, fallback_occurred: bool]
        """
        primary = self._get_primary_provider()
        secondary = self._get_secondary_provider()

        if not primary and not secondary:
            raise AIProviderNotConfiguredError(
                "No AI completion provider is configured. "
                "Please configure DEEPSEEK_API_KEY or GEMINI_API_KEY in the server environment."
            )

        # Check circuit breaker: if primary is tripped open and secondary exists, route directly
        if self._circuit_breaker.is_open and secondary:
            logger.info(f"[AI_ROUTER] Circuit breaker OPEN for primary; invoking secondary ({secondary.name}) directly.")
            try:
                resp = secondary.generate_response(
                    prompt=prompt,
                    system_prompt=system_prompt,
                    max_tokens=max_tokens,
                    temperature=temperature
                )
                return resp, True
            except Exception as sec_err:
                logger.error(f"[AI_ROUTER] Secondary provider ({secondary.name}) also failed: {sec_err}")
                raise sec_err

        # Attempt Primary Provider
        if primary:
            try:
                resp = primary.generate_response(
                    prompt=prompt,
                    system_prompt=system_prompt,
                    max_tokens=max_tokens,
                    temperature=temperature
                )
                self._circuit_breaker.record_success()
                return resp, False

            except (
                AIProviderRateLimitError,
                AIProviderServiceUnavailableError,
                AIProviderTimeoutError
            ) as retriable_err:
                self._circuit_breaker.record_failure()
                logger.warning(
                    f"[AI_ROUTER] Primary provider ({primary.name}) encountered retriable error: {retriable_err}. "
                    f"Evaluating fallback..."
                )

                if secondary:
                    logger.info(f"[AI_ROUTER] Automatically routing to secondary provider ({secondary.name})...")
                    try:
                        resp = secondary.generate_response(
                            prompt=prompt,
                            system_prompt=system_prompt,
                            max_tokens=max_tokens,
                            temperature=temperature
                        )
                        return resp, True
                    except Exception as sec_err:
                        logger.error(f"[AI_ROUTER] Secondary fallback provider ({secondary.name}) also failed: {sec_err}")
                        raise sec_err from retriable_err

                # No secondary configured; re-raise primary retriable error
                raise retriable_err

            except (
                AIProviderInvalidRequestError,
                AIProviderContextLengthError,
                AIProviderAuthenticationError
            ) as non_retriable_err:
                # Permanent client or auth error — do NOT attempt fallback
                logger.error(f"[AI_ROUTER] Non-retriable error from primary ({primary.name}): {non_retriable_err}")
                raise non_retriable_err

            except AIProviderException as generic_err:
                # Generic provider error - fallback if secondary is available
                self._circuit_breaker.record_failure()
                if secondary:
                    logger.warning(f"[AI_ROUTER] Generic error from primary ({primary.name}): {generic_err}. Retrying with secondary...")
                    try:
                        resp = secondary.generate_response(
                            prompt=prompt,
                            system_prompt=system_prompt,
                            max_tokens=max_tokens,
                            temperature=temperature
                        )
                        return resp, True
                    except Exception as sec_err:
                        raise sec_err from generic_err
                raise generic_err

        # If primary wasn't available but secondary is
        if secondary:
            resp = secondary.generate_response(
                prompt=prompt,
                system_prompt=system_prompt,
                max_tokens=max_tokens,
                temperature=temperature
            )
            return resp, True

        raise AIProviderNotConfiguredError("No active AI provider available.")

    def generate_response(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: int = 1500,
        temperature: float = 0.3
    ) -> AIResponse:
        """BaseAIProvider implementation delegating to execute()."""
        resp, _ = self.execute(
            prompt=prompt,
            system_prompt=system_prompt,
            max_tokens=max_tokens,
            temperature=temperature
        )
        return resp

    def get_status_summary(self) -> Dict[str, Any]:
        """Provides status summary for frontend capabilities reporting."""
        primary = self._get_primary_provider()
        secondary = self._get_secondary_provider()

        configured = bool(primary or secondary)
        return {
            "configured": configured,
            "primary_provider": primary.name if primary else "none",
            "primary_model": primary.model if primary else "none",
            "secondary_provider": secondary.name if secondary else "none",
            "secondary_model": secondary.model if secondary else "none",
            "circuit_breaker_open": self._circuit_breaker.is_open,
            "status": "AVAILABLE" if configured else "NOT_CONFIGURED"
        }


# Singleton router instance for application-wide reuse
ai_router = AIProviderRouter()

