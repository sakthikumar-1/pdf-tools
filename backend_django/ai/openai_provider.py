"""
Hosted OpenAI Completion Provider for Simatrix PDF Tools.
Reads OPENAI_API_KEY from server environment variables only.
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


class OpenAIProvider(BaseAIProvider):
    """
    OpenAI hosted provider using the official Python SDK.
    Supports gpt-4o-mini, gpt-4o, and other chat completion models with timeout and retry handling.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: float = 35.0,
        max_retries: int = 2
    ):
        self._api_key = api_key or os.getenv('OPENAI_API_KEY')
        if not self._api_key or not self._api_key.strip():
            raise AIProviderNotConfiguredError(
                "OpenAI API key is missing. Set OPENAI_API_KEY in the backend server environment."
            )

        self._model = model or os.getenv('OPENAI_MODEL', 'gpt-4o-mini')
        self._base_url = base_url or os.getenv('OPENAI_BASE_URL')
        self._timeout = timeout
        self._max_retries = max_retries
        self._client = None

    @property
    def name(self) -> str:
        return "openai"

    @property
    def model(self) -> str:
        return self._model

    def _get_client(self):
        if self._client is None:
            try:
                import openai
                client_kwargs = {
                    'api_key': self._api_key,
                    'timeout': self._timeout
                }
                if self._base_url:
                    client_kwargs['base_url'] = self._base_url
                self._client = openai.OpenAI(**client_kwargs)
            except ImportError:
                raise AIProviderException("OpenAI Python package is not installed.")
        return self._client

    def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: int = 1500,
        temperature: float = 0.3
    ) -> str:
        client = self._get_client()
        import openai

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        last_exception = None
        for attempt in range(self._max_retries + 1):
            try:
                response = client.chat.completions.create(
                    model=self._model,
                    messages=messages,
                    max_tokens=max_tokens,
                    temperature=temperature
                )
                if response.choices and len(response.choices) > 0:
                    content = response.choices[0].message.content
                    if content:
                        return content.strip()
                raise AIProviderException("OpenAI returned an empty response.")

            except openai.AuthenticationError as err:
                logger.error("OpenAI authentication error: invalid API key.")
                raise AIProviderAuthenticationError("Invalid or expired OpenAI API key.") from err

            except openai.RateLimitError as err:
                logger.warning(f"OpenAI rate limit hit (attempt {attempt + 1}/{self._max_retries + 1}).")
                last_exception = AIProviderRateLimitError("OpenAI API rate limit exceeded. Please try again shortly.")
                if attempt < self._max_retries:
                    time.sleep(2 ** attempt)
                    continue
                raise last_exception from err

            except openai.APITimeoutError as err:
                logger.warning(f"OpenAI API call timed out after {self._timeout}s.")
                last_exception = AIProviderTimeoutError(f"OpenAI request timed out after {self._timeout} seconds.")
                if attempt < self._max_retries:
                    time.sleep(1.5)
                    continue
                raise last_exception from err

            except openai.BadRequestError as err:
                err_msg = str(err).lower()
                if "context_length" in err_msg or "maximum context" in err_msg or "too many tokens" in err_msg:
                    raise AIProviderContextLengthError(
                        "Document exceeds OpenAI context length limits. Consider a shorter document or chunked mode."
                    ) from err
                raise AIProviderException(f"OpenAI bad request error: {str(err)}") from err

            except openai.APIConnectionError as err:
                logger.warning(f"OpenAI connection error (attempt {attempt + 1}/{self._max_retries + 1}): {err}")
                last_exception = AIProviderTimeoutError("Failed to connect to OpenAI service.")
                if attempt < self._max_retries:
                    time.sleep(1.5)
                    continue
                raise last_exception from err

            except Exception as err:
                logger.error(f"Unexpected OpenAI error: {err}", exc_info=True)
                raise AIProviderException(f"Failed to generate summary with OpenAI: {str(err)}") from err

        if last_exception:
            raise last_exception
        raise AIProviderException("Failed to generate summary with OpenAI.")
