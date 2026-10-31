"""
Simatrix PDF Tools AI Module
"""

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
from .router import AIProviderRouter, ai_router
from .factory import get_ai_provider, is_ai_configured, get_ai_status_info
from .prompts import get_summary_prompt, get_chunk_summary_prompt, get_synthesis_prompt

__all__ = [
    'BaseAIProvider',
    'AIResponse',
    'AIProviderException',
    'AIProviderNotConfiguredError',
    'AIProviderAuthenticationError',
    'AIProviderRateLimitError',
    'AIProviderTimeoutError',
    'AIProviderServiceUnavailableError',
    'AIProviderContextLengthError',
    'AIProviderInvalidRequestError',
    'DeepSeekProvider',
    'GeminiProvider',
    'MockAIProvider',
    'AIProviderRouter',
    'ai_router',
    'get_ai_provider',
    'is_ai_configured',
    'get_ai_status_info',
    'get_summary_prompt',
    'get_chunk_summary_prompt',
    'get_synthesis_prompt'
]
