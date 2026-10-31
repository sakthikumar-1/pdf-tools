"""
Hosted Google Gemini Completion Provider for Simatrix PDF Tools.
Reads GEMINI_API_KEY from server environment variables only.
Returns standardized AIResponse data contract.
"""

import os
import time
import logging
from typing import Optional
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

logger = logging.getLogger(__name__)


class GeminiProvider(BaseAIProvider):
    """
    Google Gemini hosted provider using the official Google GenAI Python SDK or REST fallback.
    Supports gemini-2.5-flash, gemini-1.5-flash, etc. with timeout, retry, and token telemetry.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        timeout: float = 45.0,
        max_retries: int = 1
    ):
        self._api_key = (
            api_key
            or getattr(settings, 'GEMINI_API_KEY', None)
            or os.getenv('GEMINI_API_KEY')
            or os.getenv('GOOGLE_API_KEY')
        )
        if not self._api_key or not self._api_key.strip():
            raise AIProviderNotConfiguredError(
                "Gemini API key is missing. Set GEMINI_API_KEY in the backend server environment."
            )

        self._model = (
            model
            or getattr(settings, 'GEMINI_MODEL', None)
            or os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')
        )
        self._timeout = timeout
        self._max_retries = max_retries
        self._client = None

    @property
    def name(self) -> str:
        return "gemini"

    @property
    def model(self) -> str:
        return self._model

    def _get_client(self):
        if self._client is None:
            try:
                from google import genai
                self._client = genai.Client(api_key=self._api_key)
            except ImportError:
                raise AIProviderException("Google GenAI Python package is not installed.")
        return self._client

    def generate_response(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: int = 1500,
        temperature: float = 0.3
    ) -> AIResponse:
        client = self._get_client()
        from google.genai import types

        config = types.GenerateContentConfig(
            temperature=temperature,
            max_output_tokens=max_tokens
        )
        if system_prompt:
            config.system_instruction = system_prompt

        last_exception = None
        start_time = time.time()

        for attempt in range(self._max_retries + 1):
            try:
                response = client.models.generate_content(
                    model=self._model,
                    contents=prompt,
                    config=config
                )
                exec_ms = max(1, int((time.time() - start_time) * 1000))

                if response and response.text:
                    content = response.text.strip()
                    prompt_tokens = max(1, len(prompt) // 4)
                    completion_tokens = max(1, len(content) // 4)

                    # Extract usage metadata if provided by SDK
                    usage_meta = getattr(response, 'usage_metadata', None)
                    if usage_meta:
                        prompt_tokens = getattr(usage_meta, 'prompt_token_count', prompt_tokens)
                        completion_tokens = getattr(usage_meta, 'candidates_token_count', completion_tokens)

                    total_tokens = prompt_tokens + completion_tokens

                    return AIResponse(
                        content=content,
                        provider="gemini",
                        model=self._model,
                        prompt_tokens=prompt_tokens,
                        completion_tokens=completion_tokens,
                        total_tokens=total_tokens,
                        execution_time_ms=exec_ms,
                        raw_metadata={"attempt": attempt + 1}
                    )

                raise AIProviderException("Gemini returned an empty response.")

            except Exception as err:
                err_str = str(err).lower()

                if "api_key" in err_str or "unauthenticated" in err_str or ("invalid" in err_str and "key" in err_str) or "permission" in err_str:
                    logger.error("Gemini authentication error: invalid API key.")
                    raise AIProviderAuthenticationError("Invalid or expired Gemini API key.") from err

                if "resource_exhausted" in err_str or "quota" in err_str or "rate" in err_str or "429" in err_str:
                    logger.warning(f"Gemini quota/rate limit hit (attempt {attempt + 1}/{self._max_retries + 1}).")
                    last_exception = AIProviderRateLimitError("Gemini API rate limit exceeded.")
                    if attempt < self._max_retries:
                        time.sleep(1.5)
                        continue
                    raise last_exception from err

                if "deadline_exceeded" in err_str or "timeout" in err_str or "timed out" in err_str:
                    logger.warning(f"Gemini API call timed out after {self._timeout}s.")
                    last_exception = AIProviderTimeoutError(f"Gemini request timed out after {self._timeout} seconds.")
                    if attempt < self._max_retries:
                        time.sleep(1.0)
                        continue
                    raise last_exception from err

                if "503" in err_str or "500" in err_str or "502" in err_str or "service unavailable" in err_str:
                    logger.warning(f"Gemini service unavailable error: {err}")
                    last_exception = AIProviderServiceUnavailableError("Gemini service temporarily unavailable (5xx).")
                    if attempt < self._max_retries:
                        time.sleep(1.0)
                        continue
                    raise last_exception from err

                if "token" in err_str and "limit" in err_str or "context" in err_str and "length" in err_str:
                    raise AIProviderContextLengthError("Document exceeds Gemini context length limits.") from err

                if "invalid argument" in err_str or "bad request" in err_str or "400" in err_str:
                    raise AIProviderInvalidRequestError(f"Invalid request parameters to Gemini: {str(err)}") from err

                logger.error(f"Unexpected Gemini error: {err}", exc_info=True)
                raise AIProviderException(f"Failed to generate completion with Gemini: {str(err)}") from err

        if last_exception:
            raise last_exception
        raise AIProviderException("Failed to generate completion with Gemini.")
