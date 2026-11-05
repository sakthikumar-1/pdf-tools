"""
Comprehensive Test Suite for Simatrix PDF Guest Identity Removal & Registered AI Quota.

Verifies:
1. Complete removal of guest endpoint (/api/v1/auth/guest returns 404).
2. /api/v1/auth/me rejects unauthenticated requests with HTTP 401; zero guest profiles created.
3. No guest identity cookie (simatrix_device_token) is ever set on any endpoint.
4. Anonymous requests to all 8 AI tools are strictly rejected with HTTP 401 AI_AUTH_REQUIRED.
5. Registered users receive exactly 5 lifetime AI credits shared across all 8 AI tools.
6. The 6th AI request is blocked across all 8 tools with HTTP 403 AI_LIMIT_REACHED.
7. Failed AI operations consume zero credits.
8. Provider fallback consumes exactly one credit.
9. Idempotency replay consumes zero additional credits.
10. Google authentication initializes 5 credits and clears any legacy simatrix_device_token cookie.
11. Subsequent Google logins preserve existing quota without resets.
12. Standard non-AI PDF utilities remain completely accessible to anonymous visitors without authentication.
13. Concurrent requests cannot exceed the registered 5-credit quota.
"""

import io
import json
import time
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
import unittest
from unittest.mock import patch, MagicMock

from reportlab.pdfgen import canvas
from django.test import TransactionTestCase, Client
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import connection, connections
from django.core.cache import cache
from django.utils import timezone

from apps.authentication.models import User, AIUserQuota, AIRateLimitBucket, GuestDeviceIdentity
from apps.authentication.guest_service import GUEST_DEVICE_COOKIE_NAME
from ai.mock_provider import MockAIProvider
from ai.provider_base import AIResponse, AIProviderServiceUnavailableError, AIProviderRateLimitError
from ai.router import AIProviderRouter
from ai.quota import reserve_slot, settle_reservation, QuotaExceededException
from ai.rate_limiter import reset_rate_limit_memory
from core.api import token_signer


def make_test_pdf(text: str = "Simatrix Authenticated AI Test Content") -> SimpleUploadedFile:
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer)
    c.drawString(50, 700, f"{text} - {uuid.uuid4().hex}")
    c.showPage()
    c.save()
    return SimpleUploadedFile(f"{uuid.uuid4().hex[:8]}.pdf", buffer.getvalue(), content_type="application/pdf")


class GuestRemovalAndRegisteredQuotaTests(TransactionTestCase):
    """Integration test suite covering guest identity removal and registered quota enforcement."""

    def setUp(self):
        super().setUp()
        cache.clear()
        AIRateLimitBucket.objects.all().delete()
        reset_rate_limit_memory()
        self.client = Client(REMOTE_ADDR=f"10.50.{uuid.uuid4().int % 250 + 1}.{uuid.uuid4().int % 250 + 1}")

    def tearDown(self):
        super().tearDown()

    def _create_registered_user(self, quota_allowed: int = 5, quota_used: int = 0):
        user = User.objects.create(
            email=f"simatrix_test_{uuid.uuid4().hex[:8]}@example.com",
            full_name="Registered User",
            role="user"
        )
        quota, _ = AIUserQuota.objects.get_or_create(
            user=user,
            defaults={"total_allowed": quota_allowed, "used_count": quota_used}
        )
        quota.total_allowed = quota_allowed
        quota.used_count = quota_used
        quota.consent_given_at = timezone.now()
        quota.consent_policy_version = "2026.1"
        quota.save()

        token = token_signer.sign_object({
            'user_id': str(user.id),
            'email': user.email,
            'ts': int(time.time())
        })
        return user, token

    def test_01_guest_endpoint_removed_returns_404(self):
        """1. /api/v1/auth/guest has been removed and returns HTTP 404 Not Found."""
        res = self.client.post("/api/v1/auth/guest")
        self.assertEqual(res.status_code, 404)
        self.assertNotIn(GUEST_DEVICE_COOKIE_NAME, res.cookies)

    def test_02_auth_me_unauthenticated_returns_401_no_guest_profile(self):
        """2. /api/v1/auth/me returns HTTP 401 for anonymous callers with zero guest user creation."""
        initial_user_count = User.objects.count()
        res = self.client.get("/api/v1/auth/me")
        self.assertEqual(res.status_code, 401)
        self.assertEqual(User.objects.count(), initial_user_count)
        self.assertNotIn(GUEST_DEVICE_COOKIE_NAME, res.cookies)

    def test_03_no_guest_cookie_created_on_any_endpoint(self):
        """3. Verifies no guest identity cookie is set on any anonymous request."""
        # Non-AI utility call
        pdf = make_test_pdf("Test for no cookie")
        res1 = self.client.post("/api/v1/security/protect-pdf", {"file": pdf, "password": "Pass"})
        self.assertEqual(res1.status_code, 200)
        self.assertNotIn(GUEST_DEVICE_COOKIE_NAME, res1.cookies)

        # AI call attempt
        pdf2 = make_test_pdf("Test for no cookie on AI")
        res2 = self.client.post("/api/v1/ai/summarize", {"file": pdf2, "mode": "quick", "consent": "true"})
        self.assertEqual(res2.status_code, 401)
        self.assertNotIn(GUEST_DEVICE_COOKIE_NAME, res2.cookies)

    def test_04_anonymous_calls_to_all_eight_ai_endpoints_return_401(self):
        """4. Direct anonymous calls to all eight AI tools are rejected with HTTP 401."""
        endpoints = [
            ("/api/v1/ai/summarize", {"file": make_test_pdf("Anon 1"), "mode": "quick", "consent": "true"}),
            ("/api/v1/ai/translate", {"file": make_test_pdf("Anon 2"), "target_language": "tamil", "consent": "true"}),
            ("/api/v1/ai/chat-pdf", {"file": make_test_pdf("Anon 3"), "query": "Hello", "consent": "true"}),
            ("/api/v1/ai/key-points", {"file": make_test_pdf("Anon 4"), "consent": True}),
            ("/api/v1/ai/extract-data", {"file": make_test_pdf("Anon 5"), "consent": True}),
            ("/api/v1/ai/generate-qns", {"file": make_test_pdf("Anon 6"), "consent": True}),
            ("/api/v1/ai/rewrite", {"file": make_test_pdf("Anon 7"), "consent": True}),
            ("/api/v1/ai/compare", {"file": make_test_pdf("Anon 8"), "consent": True}),
        ]

        for path, data in endpoints:
            res = self.client.post(path, data)
            self.assertEqual(res.status_code, 401, f"Expected 401 for unauthenticated {path}, got {res.status_code}")
            self.assertIn("Authentication required", res.json().get("detail", ""))

    def test_05_registered_user_receives_5_lifetime_credits_shared_across_all_tools(self):
        """5. Registered user receives 5 lifetime AI credits shared across all 8 tools."""
        user, token = self._create_registered_user(quota_allowed=5, quota_used=0)
        headers = {'HTTP_AUTHORIZATION': f"Bearer {token}", 'HTTP_X_SIMATRIX_AI_CONSENT': "true"}
        test_router = AIProviderRouter(primary_provider=MockAIProvider())

        tools = [
            ("/api/v1/ai/summarize", {"file": make_test_pdf("Reg 1"), "mode": "quick", "consent": "true"}),
            ("/api/v1/ai/translate", {"file": make_test_pdf("Reg 2"), "target_language": "spanish", "consent": "true"}),
            ("/api/v1/ai/chat-pdf", {"file": make_test_pdf("Reg 3"), "query": "Query", "consent": "true"}),
            ("/api/v1/ai/key-points", {"file": make_test_pdf("Reg 4"), "consent": True}),
            ("/api/v1/ai/extract-data", {"file": make_test_pdf("Reg 5"), "consent": True}),
        ]

        with patch('ai.api.global_ai_router', test_router):
            for i, (path, data) in enumerate(tools, start=1):
                res = self.client.post(path, data, **headers)
                self.assertEqual(res.status_code, 200, f"Tool {path} failed: {res.content}")
                res_data = res.json()
                self.assertTrue(res_data.get("success"))
                self.assertEqual(res_data.get("quota", {}).get("used"), i)
                self.assertEqual(res_data.get("quota", {}).get("remaining"), 5 - i)

        user.refresh_from_db()
        self.assertEqual(user.ai_quota.used_count, 5)

    def test_06_sixth_registered_request_blocked_with_403_ai_limit_reached(self):
        """6. The sixth AI request across any tool is blocked with HTTP 403 AI_LIMIT_REACHED."""
        user, token = self._create_registered_user(quota_allowed=5, quota_used=5)
        headers = {'HTTP_AUTHORIZATION': f"Bearer {token}", 'HTTP_X_SIMATRIX_AI_CONSENT': "true"}

        all_eight = [
            ("/api/v1/ai/summarize", {"file": make_test_pdf("Over 1"), "mode": "quick", "consent": "true"}),
            ("/api/v1/ai/translate", {"file": make_test_pdf("Over 2"), "target_language": "tamil", "consent": "true"}),
            ("/api/v1/ai/chat-pdf", {"file": make_test_pdf("Over 3"), "query": "Blocked", "consent": "true"}),
            ("/api/v1/ai/key-points", {"file": make_test_pdf("Over 4"), "consent": True}),
            ("/api/v1/ai/extract-data", {"file": make_test_pdf("Over 5"), "consent": True}),
            ("/api/v1/ai/generate-qns", {"file": make_test_pdf("Over 6"), "consent": True}),
            ("/api/v1/ai/rewrite", {"file": make_test_pdf("Over 7"), "consent": True}),
            ("/api/v1/ai/compare", {"file": make_test_pdf("Over 8"), "consent": True}),
        ]

        for path, data in all_eight:
            res = self.client.post(path, data, **headers)
            self.assertEqual(res.status_code, 403, f"Expected 403 for exhausted user on {path}")
            self.assertEqual(res.json().get("code"), "AI_LIMIT_REACHED")
            self.assertEqual(res.json().get("quota", {}).get("used"), 5)
            self.assertEqual(res.json().get("quota", {}).get("remaining"), 0)

    def test_07_failed_ai_operations_consume_zero_credits(self):
        """7. Upstream AI provider failures consume zero credits."""
        user, token = self._create_registered_user(quota_allowed=5, quota_used=0)
        headers = {'HTTP_AUTHORIZATION': f"Bearer {token}", 'HTTP_X_SIMATRIX_AI_CONSENT': "true"}

        failing_mock = MagicMock()
        failing_mock.name = "mock_failing"
        failing_mock.generate_response.side_effect = AIProviderServiceUnavailableError("Simulated Outage")

        test_router = AIProviderRouter(primary_provider=failing_mock)
        with patch('ai.api.global_ai_router', test_router):
            pdf = make_test_pdf("Document during outage")
            res = self.client.post(
                "/api/v1/ai/summarize",
                {"file": pdf, "mode": "quick", "consent": "true"},
                **headers
            )
            self.assertIn(res.status_code, (502, 503))

        user.refresh_from_db()
        self.assertEqual(user.ai_quota.used_count, 0)

    def test_08_provider_fallback_consumes_exactly_one_credit(self):
        """8. Transparent failover from primary to secondary consumes exactly one credit."""
        user, token = self._create_registered_user(quota_allowed=5, quota_used=0)
        headers = {'HTTP_AUTHORIZATION': f"Bearer {token}", 'HTTP_X_SIMATRIX_AI_CONSENT': "true"}

        primary_failing = MagicMock()
        primary_failing.name = "primary_rate_limited"
        primary_failing.generate_response.side_effect = AIProviderRateLimitError("Rate limit reached on primary")

        secondary_success = MockAIProvider()

        test_router = AIProviderRouter(primary_provider=primary_failing, secondary_provider=secondary_success)
        with patch('ai.api.global_ai_router', test_router):
            pdf = make_test_pdf("Document for fallback test")
            res = self.client.post(
                "/api/v1/ai/summarize",
                {"file": pdf, "mode": "quick", "consent": "true"},
                **headers
            )
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertTrue(data["success"])
            self.assertEqual(data["quota"]["used"], 1)
            self.assertEqual(data["quota"]["remaining"], 4)

        user.refresh_from_db()
        self.assertEqual(user.ai_quota.used_count, 1)

    def test_09_idempotency_replay_consumes_zero_additional_credits(self):
        """9. Idempotency key replay returns cached result with zero extra credits deducted."""
        user, token = self._create_registered_user(quota_allowed=5, quota_used=0)
        idem_key = f"idem_{uuid.uuid4().hex}"
        headers = {
            'HTTP_AUTHORIZATION': f"Bearer {token}",
            'HTTP_X_IDEMPOTENCY_KEY': idem_key,
            'HTTP_X_SIMATRIX_AI_CONSENT': "true"
        }

        test_router = AIProviderRouter(primary_provider=MockAIProvider())
        with patch('ai.api.global_ai_router', test_router):
            pdf = make_test_pdf("Document for idempotency test")
            res1 = self.client.post(
                "/api/v1/ai/summarize",
                {"file": pdf, "mode": "quick", "consent": "true", "idempotency_key": idem_key},
                **headers
            )
            self.assertEqual(res1.status_code, 200)
            self.assertEqual(res1.json()["quota"]["used"], 1)

            # Replay with same idempotency key
            pdf2 = make_test_pdf("Document 2 with identical idempotency key")
            res2 = self.client.post(
                "/api/v1/ai/summarize",
                {"file": pdf2, "mode": "quick", "consent": "true", "idempotency_key": idem_key},
                **headers
            )
            self.assertEqual(res2.status_code, 200)
            self.assertEqual(res2.json()["quota"]["used"], 1)

        user.refresh_from_db()
        self.assertEqual(user.ai_quota.used_count, 1)

    def test_10_google_auth_initializes_5_credits_and_clears_obsolete_guest_cookie(self):
        """10. Google login initializes 5 credits and clears any legacy simatrix_device_token cookie."""
        client = Client()
        client.cookies[GUEST_DEVICE_COOKIE_NAME] = "legacy_cookie_value_to_purge"

        email = f"google_user_{uuid.uuid4().hex[:6]}@example.com"
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "iss": "https://accounts.google.com",
            "sub": f"sub_google_{uuid.uuid4().hex[:8]}",
            "email": email,
            "name": "Google User",
            "email_verified": True,
            "exp": int(time.time()) + 3600
        }
        with patch("requests.get", return_value=mock_resp):
            res = client.post(
                "/api/v1/auth/google",
                json.dumps({"credential": "mock_credential", "name": "Google User"}),
                content_type="application/json"
            )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertIn("token", data)
        self.assertEqual(data["quota"]["limit"], 5)
        self.assertEqual(data["quota"]["used"], 0)
        self.assertEqual(data["quota"]["remaining"], 5)

        # Verify device cookie is cleared in response
        self.assertIn(GUEST_DEVICE_COOKIE_NAME, res.cookies)
        self.assertEqual(res.cookies[GUEST_DEVICE_COOKIE_NAME].value, "")

    def test_11_subsequent_google_logins_preserve_existing_quota(self):
        """11. Subsequent Google logins preserve existing quota without resetting."""
        email = f"google_repeat_{uuid.uuid4().hex[:6]}@example.com"

        # First login
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "iss": "https://accounts.google.com",
            "sub": f"sub_repeat_{uuid.uuid4().hex[:8]}",
            "email": email,
            "name": "Repeat User",
            "email_verified": True,
            "exp": int(time.time()) + 3600
        }
        with patch("requests.get", return_value=mock_resp):
            res1 = self.client.post(
                "/api/v1/auth/google",
                json.dumps({"credential": "cred", "name": "Repeat User"}),
                content_type="application/json"
            )
        self.assertEqual(res1.status_code, 200)
        user = User.objects.get(email=email)
        user.ai_quota.used_count = 3
        user.ai_quota.save()

        # Second login
        with patch("requests.get", return_value=mock_resp):
            res2 = self.client.post(
                "/api/v1/auth/google",
                json.dumps({"credential": "cred", "name": "Repeat User"}),
                content_type="application/json"
            )
        self.assertEqual(res2.status_code, 200)
        data2 = res2.json()
        self.assertEqual(data2["quota"]["used"], 3)
        self.assertEqual(data2["quota"]["remaining"], 2)

    def test_12_non_ai_pdf_utilities_remain_accessible_to_anonymous_visitors(self):
        """12. Standard non-AI PDF utilities remain completely functional without authentication."""
        pdf = make_test_pdf("Document for standard PDF protection")
        res = self.client.post(
            "/api/v1/security/protect-pdf",
            {"file": pdf, "password": "SamplePassword123"}
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()["success"])
        self.assertNotIn(GUEST_DEVICE_COOKIE_NAME, res.cookies)

    @unittest.skipIf(connection.vendor == 'sqlite', "Multi-threaded concurrency requires MySQL InnoDB row-level locking")
    def test_13_concurrent_requests_cannot_exceed_registered_quota(self):
        """13. Concurrent requests from the same user cannot exceed the 5-credit quota."""
        user, _ = self._create_registered_user(quota_allowed=5, quota_used=4)
        results = []

        def attempt_reservation(worker_id):
            for conn in connections.all():
                conn.close()

            idem_key = f"concurrent_reg_req_{worker_id}"
            try:
                res, created, state = reserve_slot(
                    user=user,
                    idempotency_key=idem_key,
                    tool_type="summarize"
                )
                if created and state == "RESERVED":
                    return True
                return False
            except QuotaExceededException:
                return False

        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(attempt_reservation, i) for i in range(5)]
            for f in as_completed(futures):
                results.append(f.result())

        successful_reservations = [r for r in results if r is True]
        self.assertEqual(
            len(successful_reservations), 1,
            f"Expected exactly 1 slot won out of remaining credit, got {len(successful_reservations)}"
        )
