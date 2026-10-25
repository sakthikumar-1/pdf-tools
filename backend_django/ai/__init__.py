"""
Simatrix PDF Tools AI Module
"""

from .provider_base import (
    BaseAIProvider,
    AIProviderException,
    AIProviderNotConfiguredError,
    AIProviderAuthenticationError,
    AIProviderRateLimitError,
    AIProviderTimeoutError,
    AIProviderContextLengthError
)
from .factory import get_ai_provider, is_ai_configured, get_ai_status_info
from .prompts import get_summary_prompt, get_chunk_summary_prompt, get_synthesis_prompt

__all__ = [
    'BaseAIProvider',
    'AIProviderException',
    'AIProviderNotConfiguredError',
    'AIProviderAuthenticationError',
    'AIProviderRateLimitError',
    'AIProviderTimeoutError',
    'AIProviderContextLengthError',
    'get_ai_provider',
    'is_ai_configured',
    'get_ai_status_info',
    'get_summary_prompt',
    'get_chunk_summary_prompt',
    'get_synthesis_prompt'
]
