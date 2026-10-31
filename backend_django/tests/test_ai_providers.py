"""
Comprehensive Unit Tests for Simatrix AI Provider Infrastructure.
Tests DeepSeekProvider, GeminiProvider, MockAIProvider, and AIProviderRouter.
Validates error mapping, token accounting, circuit breaker, and automatic fallback.
"""

import time
from unittest.mock import patch, MagicMock
from django.test import SimpleTestCase, override_settings

from ai.provider_base import (
    AIResponse,
    AIProviderException,
    AIProviderNotConfiguredError,
    AIProviderAuthenticationError,
    AIProviderRateLimitError,
    AIProviderTimeoutError,
    AIProviderServiceUnavailableError,
    AIProviderInvalidRequestError,
    BaseAIProvider
)
from ai.deepseek_provider import DeepSeekProvider
from ai.gemini_provider import GeminiProvider
from ai.mock_provider import MockAIProvider
from ai.router import AIProviderRouter, CircuitBreaker


class DeepSeekProviderTests(SimpleTestCase):
    """Unit tests for the DeepSeek hosted API provider adapter."""

    def test_missing_api_key_raises_error(self):
        with override_settings(DEEPSEEK_API_KEY=""):
            with patch.dict("os.environ", {"DEEPSEEK_API_KEY": ""}):
                with self.assertRaises(AIProviderNotConfiguredError):
                    DeepSeekProvider(api_key=None)

    @patch("requests.post")
    def test_successful_completion(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "id": "c-12345",
            "choices": [{
                "message": {"role": "assistant", "content": "DeepSeek generated summary."},
                "finish_reason": "stop"
            }],
            "usage": {
                "prompt_tokens": 150,
                "completion_tokens": 45,
                "total_tokens": 195
            }
        }
        mock_post.return_value = mock_resp

        provider = DeepSeekProvider(api_key="sk-test-key", model="deepseek-chat")
        result = provider.generate_response(prompt="Hello document", system_prompt="System instructions")

        self.assertIsInstance(result, AIResponse)
        self.assertEqual(result.content, "DeepSeek generated summary.")
        self.assertEqual(result.provider, "deepseek")
        self.assertEqual(result.model, "deepseek-chat")
        self.assertEqual(result.prompt_tokens, 150)
        self.assertEqual(result.completion_tokens, 45)
        self.assertEqual(result.total_tokens, 195)
        self.assertGreaterEqual(result.execution_time_ms, 0)

        # Also test backward-compatible .generate() string output
        text = provider.generate(prompt="Hello document")
        self.assertEqual(text, "DeepSeek generated summary.")

    @patch("requests.post")
    def test_rate_limit_429_maps_to_exception(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 429
        mock_resp.text = "Rate limit exceeded"
        mock_resp.json.return_value = {"error": {"message": "Rate limit reached"}}
        mock_post.return_value = mock_resp

        provider = DeepSeekProvider(api_key="sk-test-key")
        with self.assertRaises(AIProviderRateLimitError):
            provider.generate_response(prompt="Test rate limit")

    @patch("requests.post")
    def test_server_error_500_maps_to_service_unavailable(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 503
        mock_resp.text = "Service Unavailable"
        mock_resp.json.return_value = {"error": {"message": "Server overloaded"}}
        mock_post.return_value = mock_resp

        provider = DeepSeekProvider(api_key="sk-test-key")
        with self.assertRaises(AIProviderServiceUnavailableError):
            provider.generate_response(prompt="Test 503")

    @patch("requests.post")
    def test_timeout_maps_to_timeout_exception(self, mock_post):
        import requests
        mock_post.side_effect = requests.exceptions.Timeout("Connection timed out after 45s")

        provider = DeepSeekProvider(api_key="sk-test-key")
        with self.assertRaises(AIProviderTimeoutError):
            provider.generate_response(prompt="Test timeout")

    @patch("requests.post")
    def test_auth_error_401_maps_to_auth_exception(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 401
        mock_resp.text = "Unauthorized"
        mock_resp.json.return_value = {"error": {"message": "Invalid API key provided"}}
        mock_post.return_value = mock_resp

        provider = DeepSeekProvider(api_key="sk-bad-key")
        with self.assertRaises(AIProviderAuthenticationError):
            provider.generate_response(prompt="Test auth")

    @patch("requests.post")
    def test_bad_request_400_maps_to_invalid_request(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 400
        mock_resp.text = "Bad Request"
        mock_resp.json.return_value = {"error": {"message": "Invalid prompt formatting"}}
        mock_post.return_value = mock_resp

        provider = DeepSeekProvider(api_key="sk-test-key")
        with self.assertRaises(AIProviderInvalidRequestError):
            provider.generate_response(prompt="Test 400")


class GeminiProviderTests(SimpleTestCase):
    """Unit tests for the Google Gemini hosted provider adapter."""

    def test_missing_api_key_raises_error(self):
        with override_settings(GEMINI_API_KEY=""):
            with patch.dict("os.environ", {"GEMINI_API_KEY": "", "GOOGLE_API_KEY": ""}):
                with self.assertRaises(AIProviderNotConfiguredError):
                    GeminiProvider(api_key=None)

    def test_successful_completion_mocked(self):
        provider = GeminiProvider(api_key="AIzaSyTestKey", model="gemini-2.5-flash")

        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.text = "Gemini synthesized output."
        mock_response.usage_metadata.prompt_token_count = 120
        mock_response.usage_metadata.candidates_token_count = 40
        mock_client.models.generate_content.return_value = mock_response

        with patch.object(provider, "_get_client", return_value=mock_client):
            res = provider.generate_response(prompt="Test prompt", system_prompt="System rule")

            self.assertEqual(res.content, "Gemini synthesized output.")
            self.assertEqual(res.provider, "gemini")
            self.assertEqual(res.model, "gemini-2.5-flash")
            self.assertEqual(res.prompt_tokens, 120)
            self.assertEqual(res.completion_tokens, 40)
            self.assertEqual(res.total_tokens, 160)


class MockProviderTests(SimpleTestCase):
    """Unit tests for the deterministic MockAIProvider."""

    def test_mock_generate_response_modes(self):
        provider = MockAIProvider()

        modes = ["quick", "detailed", "key_points", "section_by_section"]
        for mode in modes:
            prompt = f"Please provide a {mode} summary of: <document_context>Financial Report 2026. Revenue grew 20%.</document_context>"
            resp = provider.generate_response(prompt=prompt)
            self.assertIsInstance(resp, AIResponse)
            self.assertEqual(resp.provider, "mock")
            self.assertGreater(len(resp.content), 20)
            self.assertGreater(resp.total_tokens, 0)

    def test_mock_simulated_errors(self):
        p_timeout = MockAIProvider(simulate_error="timeout")
        with self.assertRaises(AIProviderTimeoutError):
            p_timeout.generate_response("hello")

        p_rate = MockAIProvider(simulate_error="rate_limit")
        with self.assertRaises(AIProviderRateLimitError):
            p_rate.generate_response("hello")

        p_503 = MockAIProvider(simulate_error="server_error")
        with self.assertRaises(AIProviderServiceUnavailableError):
            p_503.generate_response("hello")


class AIProviderRouterTests(SimpleTestCase):
    """Unit tests for AIProviderRouter automatic fallback and circuit breaker."""

    def test_primary_success_does_not_fallback(self):
        primary_mock = MagicMock(spec=BaseAIProvider)
        primary_mock.name = "deepseek"
        primary_mock.model = "deepseek-chat"
        primary_mock.generate_response.return_value = AIResponse(
            content="Primary output",
            provider="deepseek",
            model="deepseek-chat",
            prompt_tokens=100,
            completion_tokens=50,
            total_tokens=150,
            execution_time_ms=500
        )

        secondary_mock = MagicMock(spec=BaseAIProvider)
        secondary_mock.name = "gemini"
        secondary_mock.model = "gemini-2.5-flash"

        router = AIProviderRouter(primary_provider=primary_mock, secondary_provider=secondary_mock)
        resp, fallback_occurred = router.execute(prompt="Summarize this")

        self.assertFalse(fallback_occurred)
        self.assertEqual(resp.content, "Primary output")
        self.assertEqual(resp.provider, "deepseek")
        primary_mock.generate_response.assert_called_once()
        secondary_mock.generate_response.assert_not_called()

    def test_primary_429_triggers_secondary_fallback(self):
        primary_mock = MagicMock(spec=BaseAIProvider)
        primary_mock.name = "deepseek"
        primary_mock.model = "deepseek-chat"
        primary_mock.generate_response.side_effect = AIProviderRateLimitError("DeepSeek 429 quota reached")

        secondary_mock = MagicMock(spec=BaseAIProvider)
        secondary_mock.name = "gemini"
        secondary_mock.model = "gemini-2.5-flash"
        secondary_mock.generate_response.return_value = AIResponse(
            content="Fallback Gemini output",
            provider="gemini",
            model="gemini-2.5-flash",
            prompt_tokens=100,
            completion_tokens=60,
            total_tokens=160,
            execution_time_ms=750
        )

        router = AIProviderRouter(primary_provider=primary_mock, secondary_provider=secondary_mock)
        resp, fallback_occurred = router.execute(prompt="Summarize this")

        self.assertTrue(fallback_occurred)
        self.assertEqual(resp.content, "Fallback Gemini output")
        self.assertEqual(resp.provider, "gemini")
        primary_mock.generate_response.assert_called_once()
        secondary_mock.generate_response.assert_called_once()

    def test_primary_503_triggers_secondary_fallback(self):
        primary_mock = MagicMock(spec=BaseAIProvider)
        primary_mock.name = "deepseek"
        primary_mock.model = "deepseek-chat"
        primary_mock.generate_response.side_effect = AIProviderServiceUnavailableError("DeepSeek 503 outage")

        secondary_mock = MagicMock(spec=BaseAIProvider)
        secondary_mock.name = "gemini"
        secondary_mock.model = "gemini-2.5-flash"
        secondary_mock.generate_response.return_value = AIResponse(
            content="Gemini rescued output",
            provider="gemini",
            model="gemini-2.5-flash",
            prompt_tokens=100,
            completion_tokens=40,
            total_tokens=140,
            execution_time_ms=600
        )

        router = AIProviderRouter(primary_provider=primary_mock, secondary_provider=secondary_mock)
        resp, fallback_occurred = router.execute(prompt="Summarize this")

        self.assertTrue(fallback_occurred)
        self.assertEqual(resp.content, "Gemini rescued output")

    def test_primary_timeout_triggers_secondary_fallback(self):
        primary_mock = MagicMock(spec=BaseAIProvider)
        primary_mock.name = "deepseek"
        primary_mock.model = "deepseek-chat"
        primary_mock.generate_response.side_effect = AIProviderTimeoutError("DeepSeek 45s timeout")

        secondary_mock = MagicMock(spec=BaseAIProvider)
        secondary_mock.name = "gemini"
        secondary_mock.model = "gemini-2.5-flash"
        secondary_mock.generate_response.return_value = AIResponse(
            content="Gemini recovered output",
            provider="gemini",
            model="gemini-2.5-flash",
            prompt_tokens=90,
            completion_tokens=30,
            total_tokens=120,
            execution_time_ms=400
        )

        router = AIProviderRouter(primary_provider=primary_mock, secondary_provider=secondary_mock)
        resp, fallback_occurred = router.execute(prompt="Summarize this")

        self.assertTrue(fallback_occurred)
        self.assertEqual(resp.content, "Gemini recovered output")

    def test_non_retriable_400_does_not_trigger_fallback(self):
        primary_mock = MagicMock(spec=BaseAIProvider)
        primary_mock.name = "deepseek"
        primary_mock.model = "deepseek-chat"
        primary_mock.generate_response.side_effect = AIProviderInvalidRequestError("Bad request syntax")

        secondary_mock = MagicMock(spec=BaseAIProvider)
        secondary_mock.name = "gemini"

        router = AIProviderRouter(primary_provider=primary_mock, secondary_provider=secondary_mock)
        with self.assertRaises(AIProviderInvalidRequestError):
            router.execute(prompt="Bad request")

        primary_mock.generate_response.assert_called_once()
        secondary_mock.generate_response.assert_not_called()

    def test_circuit_breaker_trips_after_threshold_failures(self):
        cb = CircuitBreaker(failure_threshold=3, recovery_time_seconds=60.0)
        self.assertFalse(cb.is_open)

        cb.record_failure()
        self.assertFalse(cb.is_open)
        cb.record_failure()
        self.assertFalse(cb.is_open)
        cb.record_failure()
        self.assertTrue(cb.is_open)

        # Reset on success
        cb.record_success()
        self.assertFalse(cb.is_open)

    def test_circuit_breaker_routes_directly_to_secondary_when_open(self):
        primary_mock = MagicMock(spec=BaseAIProvider)
        primary_mock.name = "deepseek"
        primary_mock.generate_response.side_effect = AIProviderServiceUnavailableError("503")

        secondary_mock = MagicMock(spec=BaseAIProvider)
        secondary_mock.name = "gemini"
        secondary_mock.model = "gemini-2.5-flash"
        secondary_mock.generate_response.return_value = AIResponse(
            content="Direct secondary",
            provider="gemini",
            model="gemini-2.5-flash"
        )

        router = AIProviderRouter(primary_provider=primary_mock, secondary_provider=secondary_mock)
        router._circuit_breaker.failure_threshold = 2

        # 1st failure: primary fails -> fallback to secondary
        router.execute("prompt 1")
        # 2nd failure: primary fails -> fallback to secondary -> circuit trips OPEN!
        router.execute("prompt 2")
        self.assertTrue(router._circuit_breaker.is_open)

        # 3rd call: circuit is OPEN. Must NOT call primary at all!
        primary_mock.generate_response.reset_mock()
        secondary_mock.generate_response.reset_mock()

        resp, fallback = router.execute("prompt 3")
        self.assertTrue(fallback)
        primary_mock.generate_response.assert_not_called()
        secondary_mock.generate_response.assert_called_once()

