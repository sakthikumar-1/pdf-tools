"""
Hosted DeepSeek API Completion Provider for Simatrix PDF Tools.
Reads DEEPSEEK_API_KEY and DEEPSEEK_MODEL from server environment variables only.
Uses OpenAI-compatible REST endpoint with robust error mapping.
"""

import os
import time
import json
import logging
from typing import Optional, Dict, Any
import requests
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


class DeepSeekProvider(BaseAIProvider):
    """
    Hosted DeepSeek API completion provider.
    Connects to DeepSeek's OpenAI-compatible completions API with
    strict timeout boundaries, token accounting, and standardized error translation.
    """

    DEFAULT_BASE_URL = "https://api.deepseek.com/v1"
    DEFAULT_MODEL = "deepseek-chat"

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: float = 45.0
    ):
        self._api_key = (
            api_key
            or getattr(settings, 'DEEPSEEK_API_KEY', None)
            or os.getenv('DEEPSEEK_API_KEY')
        )
        if not self._api_key or not self._api_key.strip():
            raise AIProviderNotConfiguredError(
                "DeepSeek API key is missing. Set DEEPSEEK_API_KEY in the backend server environment."
            )

        self._model = (
            model
            or getattr(settings, 'DEEPSEEK_MODEL', None)
            or os.getenv('DEEPSEEK_MODEL', self.DEFAULT_MODEL)
        )
        self._base_url = (
            base_url
            or getattr(settings, 'DEEPSEEK_BASE_URL', None)
            or os.getenv('DEEPSEEK_BASE_URL', self.DEFAULT_BASE_URL)
        ).rstrip('/')
        self._timeout = timeout

    @property
    def name(self) -> str:
        return "deepseek"

    @property
    def model(self) -> str:
        return self._model

    def generate_response(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: int = 1500,
        temperature: float = 0.3
    ) -> AIResponse:
        endpoint = f"{self._base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
            "User-Agent": "SimatrixPDF/2.0"
        }

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self._model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stream": False
        }

        start_time = time.time()
        try:
            response = requests.post(
                endpoint,
                headers=headers,
                json=payload,
                timeout=self._timeout
            )
        except requests.exceptions.Timeout as exc:
            logger.warning(f"DeepSeek API request timed out after {self._timeout}s: {exc}")
            raise AIProviderTimeoutError(f"DeepSeek request timed out after {self._timeout} seconds.") from exc
        except requests.exceptions.ConnectionError as exc:
            logger.warning(f"DeepSeek connection error: {exc}")
            raise AIProviderServiceUnavailableError("Failed to connect to DeepSeek API endpoint.") from exc
        except requests.exceptions.RequestException as exc:
            logger.error(f"DeepSeek network transport exception: {exc}")
            raise AIProviderServiceUnavailableError(f"DeepSeek transport error: {str(exc)}") from exc

        exec_ms = max(1, int((time.time() - start_time) * 1000))
        status_code = response.status_code

        # Error Mapping
        if status_code != 200:
            err_text = ""
            try:
                err_json = response.json()
                err_text = err_json.get("error", {}).get("message", response.text)
            except Exception:
                err_text = response.text[:200]

            logger.warning(f"DeepSeek API returned error HTTP {status_code}: {err_text}")

            if status_code in (401, 403):
                raise AIProviderAuthenticationError(f"Invalid or unauthorized DeepSeek API credentials ({status_code}): {err_text}")
            elif status_code == 429:
                raise AIProviderRateLimitError(f"DeepSeek rate limit or quota depleted ({status_code}): {err_text}")
            elif status_code in (500, 502, 503, 504):
                raise AIProviderServiceUnavailableError(f"DeepSeek service temporarily unavailable ({status_code}): {err_text}")
            elif status_code in (400, 422):
                if "context_length" in err_text.lower() or "maximum context" in err_text.lower():
                    raise AIProviderContextLengthError(f"Input exceeds DeepSeek context window: {err_text}")
                raise AIProviderInvalidRequestError(f"DeepSeek rejected request syntax ({status_code}): {err_text}")
            else:
                raise AIProviderException(f"DeepSeek API error ({status_code}): {err_text}")

        # Parse success body
        try:
            data = response.json()
            choices = data.get("choices", [])
            if not choices:
                raise AIProviderException("DeepSeek returned response with no choices.")

            content = choices[0].get("message", {}).get("content", "").strip()
            if not content:
                raise AIProviderException("DeepSeek returned empty message content.")

            usage = data.get("usage", {})
            prompt_tokens = usage.get("prompt_tokens", max(1, len(prompt) // 4))
            completion_tokens = usage.get("completion_tokens", max(1, len(content) // 4))
            total_tokens = usage.get("total_tokens", prompt_tokens + completion_tokens)

            return AIResponse(
                content=content,
                provider="deepseek",
                model=self._model,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
                execution_time_ms=exec_ms,
                raw_metadata={
                    "finish_reason": choices[0].get("finish_reason"),
                    "system_fingerprint": data.get("system_fingerprint")
                }
            )

        except (json.JSONDecodeError, KeyError) as exc:
            logger.error(f"Failed to decode DeepSeek JSON payload: {exc}")
            raise AIProviderException(f"Malformed JSON response from DeepSeek: {str(exc)}") from exc

