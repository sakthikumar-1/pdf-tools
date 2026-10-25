"""
Hosted Google Gemini Completion Provider for Simatrix PDF Tools.
Reads GEMINI_API_KEY from server environment variables only.
"""

import os
import time
import logging
from typing import Optional

from .provider_base import (
    BaseAIProvider,
    AIProviderException,
    AIProviderNotConfiguredError,
    AIProviderAuthenticationError,
    AIProviderRateLimitError,
    AIProviderTimeoutError,
    AIProviderContextLengthError
)

logger = logging.getLogger(__name__)


class GeminiProvider(BaseAIProvider):
    """
    Google Gemini hosted provider using the official Google GenAI Python SDK.
    Supports gemini-1.5-flash, gemini-1.5-pro, gemini-2.5-flash with timeout and retry handling.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        timeout: float = 35.0,
        max_retries: int = 2
    ):
        self._api_key = api_key or os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY')
        if not self._api_key or not self._api_key.strip():
            raise AIProviderNotConfiguredError(
                "Gemini API key is missing. Set GEMINI_API_KEY in the backend server environment."
            )

        self._model = model or os.getenv('GEMINI_MODEL', 'gemini-3.1-flash-lite')
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

    def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: int = 1500,
        temperature: float = 0.3
    ) -> str:
        client = self._get_client()
        from google.genai import types

        config = types.GenerateContentConfig(
            temperature=temperature,
            max_output_tokens=max_tokens
        )
        if system_prompt:
            config.system_instruction = system_prompt

        last_exception = None
        for attempt in range(self._max_retries + 1):
            try:
                response = client.models.generate_content(
                    model=self._model,
                    contents=prompt,
                    config=config
                )
                if response and response.text:
                    return response.text.strip()
                raise AIProviderException("Gemini returned an empty response.")

            except Exception as err:
                err_str = str(err).lower()

                if "api_key" in err_str or "invalid" in err_str and "key" in err_str or "unauthenticated" in err_str or "permission" in err_str:
                    logger.error("Gemini authentication error: invalid API key.")
                    raise AIProviderAuthenticationError("Invalid or expired Gemini API key.") from err

                if "resource_exhausted" in err_str or "quota" in err_str or "rate" in err_str:
                    logger.warning(f"Gemini quota/rate limit hit (attempt {attempt + 1}/{self._max_retries + 1}).")
                    last_exception = AIProviderRateLimitError("Gemini API rate limit exceeded. Please try again shortly.")
                    if attempt < self._max_retries:
                        time.sleep(2 ** attempt)
                        continue
                    raise last_exception from err

                if "deadline_exceeded" in err_str or "timeout" in err_str or "timed out" in err_str:
                    logger.warning(f"Gemini API call timed out after {self._timeout}s.")
                    last_exception = AIProviderTimeoutError(f"Gemini request timed out after {self._timeout} seconds.")
                    if attempt < self._max_retries:
                        time.sleep(1.5)
                        continue
                    raise last_exception from err

                if "token" in err_str and "limit" in err_str or "context" in err_str and "length" in err_str:
                    raise AIProviderContextLengthError("Document exceeds Gemini context length limits.") from err

                logger.error(f"Unexpected Gemini error: {err}", exc_info=True)
                raise AIProviderException(f"Failed to generate summary with Gemini: {str(err)}") from err

        if last_exception:
            raise last_exception
        raise AIProviderException("Failed to generate summary with Gemini.")
