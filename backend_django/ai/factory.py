"""
AI Provider Factory & Configuration Inspector.
Centralized resolution of AI completion providers without hardcoded credentials or key exposure.
"""

import os
import sys
from typing import Optional, Dict, Any
from django.conf import settings

from .provider_base import (
    BaseAIProvider,
    AIProviderNotConfiguredError
)
from .mock_provider import MockAIProvider
from .gemini_provider import GeminiProvider
from .deepseek_provider import DeepSeekProvider
from .router import ai_router, AIProviderRouter


def get_ai_provider(provider_name: Optional[str] = None) -> BaseAIProvider:
    """
    Instantiates and returns the configured AI provider.
    Supports 'deepseek', 'gemini', 'router', or 'mock'.
    Defaults to the intelligent multi-provider router when available,
    while preserving backward compatibility for existing Gemini/Mock deployments.
    """
    target = (provider_name or getattr(settings, 'AI_PROVIDER', None) or os.getenv('AI_PROVIDER', '')).lower().strip()

    is_testing = (
        getattr(settings, 'IS_TESTING', False)
        or ('test' in sys.argv)
        or os.getenv('DJANGO_TESTING', '').lower() in ('1', 'true')
    )

    if target == 'mock' or (is_testing and not target):
        return MockAIProvider()

    if target == 'deepseek':
        return DeepSeekProvider()

    if target == 'gemini':
        return GeminiProvider()

    if target == 'router':
        return ai_router

    # Auto-detection:
    # If DeepSeek key is available, use ai_router (with DeepSeek primary + Gemini fallback)
    deepseek_key = getattr(settings, 'DEEPSEEK_API_KEY', None) or os.getenv('DEEPSEEK_API_KEY')
    if deepseek_key and deepseek_key.strip():
        return ai_router

    # If only Gemini key is available, return GeminiProvider directly for 100% legacy compatibility
    gemini_key = getattr(settings, 'GEMINI_API_KEY', None) or os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY')
    if gemini_key and gemini_key.strip():
        return GeminiProvider(api_key=gemini_key)

    raise AIProviderNotConfiguredError(
        "No AI provider is configured. Please set DEEPSEEK_API_KEY or GEMINI_API_KEY in the server environment."
    )


def is_ai_configured() -> bool:
    """Checks whether an AI provider is currently configured and operational."""
    target = (getattr(settings, 'AI_PROVIDER', None) or os.getenv('AI_PROVIDER', '')).lower().strip()
    if target == 'mock':
        return True

    is_testing = (
        getattr(settings, 'IS_TESTING', False)
        or ('test' in sys.argv)
        or os.getenv('DJANGO_TESTING', '').lower() in ('1', 'true')
    )
    if is_testing and not target:
        return True

    deepseek_key = getattr(settings, 'DEEPSEEK_API_KEY', None) or os.getenv('DEEPSEEK_API_KEY')
    if deepseek_key and deepseek_key.strip():
        return True

    gemini_key = getattr(settings, 'GEMINI_API_KEY', None) or os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY')
    if gemini_key and gemini_key.strip():
        return True

    return False


def get_ai_status_info() -> Dict[str, Any]:
    """Returns safe, public status details of the AI service for frontend capabilities."""
    configured = is_ai_configured()
    try:
        provider = get_ai_provider()
        return {
            "configured": True,
            "provider": provider.name,
            "model": provider.model,
            "status": "AVAILABLE"
        }
    except AIProviderNotConfiguredError:
        return {
            "configured": False,
            "provider": "none",
            "model": "none",
            "status": "NOT_CONFIGURED"
        }
