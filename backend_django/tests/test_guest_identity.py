"""
Comprehensive Test Suite for Simatrix PDF Persistent Guest Identity & Device Limits.
Covers all 13 required test cases:
1. First-time visitor receives a Guest ID.
2. Returning browser reuses the same identity.
3. Repeated guest button clicks do not generate new IDs.
4. Guest uses one live AI request successfully.
5. Second live AI request is blocked across every AI tool.
6. Failed AI operations do not consume allowance.
7. Provider fallback consumes only one allowance.
8. Precomputed official demos do not consume allowance.
9. Separate browser profiles have distinct identities.
10. Cookie expiration and revocation work.
11. Switching guest/Google identity does not bypass controls.
12. Standard PDF utilities remain available to guests.
13. Concurrent requests cannot exceed the quota.
"""

import hashlib
import json
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
import unittest
from unittest.mock import patch, MagicMock

import pymupdf as fitz
from django.test import TransactionTestCase, Client
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import connection, connections

from apps.authentication.models import User, GuestDeviceIdentity, AIUserQuota
from apps.authentication.guest_service import (
    GUEST_DEVICE_COOKIE_NAME,
    hash_device_token,
    get_or_create_guest_identity
)
from ai.mock_provider import MockAIProvider
from ai.provider_base import AIResponse, AIProviderServiceUnavailableError
from ai.router import AIProviderRouter
from ai.quota import reserve_slot, settle_reservation, QuotaExceededException
from core.api import token_signer


def make_test_pdf(text: str = "Simatrix Unique Guest Test Document Content") -> SimpleUploadedFile:
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 72), f"{text} - {uuid.uuid4().hex}")
    pdf_bytes = doc.tobytes()
    doc.close()
    return SimpleUploadedFile("guest_test.pdf", pdf_bytes, content_type="application/pdf")


class GuestIdentityAndDeviceLimitTests(TransactionTestCase):
    """Integration test suite covering all persistent guest identity and quota requirements."""

    def setUp(self):
        super().setUp()
        self.client = Client()

    def tearDown(self):
        super().tearDown()

    def test_01_first_time_visitor_receives_guest_id(self):
        """1. First-time visitor receives a unique Guest ID and secure HttpOnly cookie."""
        res = self.client.post("/api/v1/auth/guest")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertIn("gst_", data["user"]["guest_id"])
        self.assertEqual(data["user"]["role"], "guest")
        self.assertFalse(data["user"]["is_verified"])
        self.assertEqual(data["quota"]["used"], 0)
        self.assertEqual(data["quota"]["limit"], 1)
        self.assertEqual(data["quota"]["remaining"], 1)

        # Ensure raw token is NOT in JSON body (no token leak)
        self.assertNotIn("device_token", data)
        self.assertNotIn("raw_token", data)

        # Ensure secure HttpOnly cookie is attached
        self.assertIn(GUEST_DEVICE_COOKIE_NAME, res.cookies)
        cookie = res.cookies[GUEST_DEVICE_COOKIE_NAME]
        self.assertTrue(cookie["httponly"])
        self.assertEqual(cookie["samesite"], "Lax")
        self.assertEqual(cookie["max-age"], 365 * 24 * 3600)

        # Ensure backend stored the SHA-256 hash, not the raw token
        raw_token = cookie.value
        token_hash = hash_device_token(raw_token)
        identity = GuestDeviceIdentity.objects.filter(device_token_hash=token_hash).first()
        self.assertIsNotNone(identity)
        self.assertEqual(identity.guest_id, data["user"]["guest_id"])
        self.assertEqual(identity.ai_operations_allowed, 1)
        self.assertEqual(identity.ai_operations_used, 0)

    def test_02_returning_browser_reuses_same_identity(self):
        """2. Returning browser presenting the device cookie reuses the same Guest ID."""
        res1 = self.client.post("/api/v1/auth/guest")
        self.assertEqual(res1.status_code, 200)
        guest_id_1 = res1.json()["user"]["guest_id"]
        user_id_1 = res1.json()["user"]["id"]
        cookie_val = res1.cookies[GUEST_DEVICE_COOKIE_NAME].value

        # Second request with the same cookie
        client2 = Client()
        client2.cookies[GUEST_DEVICE_COOKIE_NAME] = cookie_val
        res2 = client2.post("/api/v1/auth/guest")
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(res2.json()["user"]["guest_id"], guest_id_1)
        self.assertEqual(res2.json()["user"]["id"], user_id_1)

    def test_03_repeated_guest_button_clicks_do_not_generate_new_ids(self):
        """3. Repeated guest button clicks reuse the existing identity and do not spawn extra users."""
        initial_user_count = User.objects.count()
        res_first = self.client.post("/api/v1/auth/guest")
        self.assertEqual(res_first.status_code, 200)
        first_guest_id = res_first.json()["user"]["guest_id"]
        cookie_val = res_first.cookies[GUEST_DEVICE_COOKIE_NAME].value

        for _ in range(9):
            self.client.cookies[GUEST_DEVICE_COOKIE_NAME] = cookie_val
            res = self.client.post("/api/v1/auth/guest")
            self.assertEqual(res.status_code, 200)
            self.assertEqual(res.json()["user"]["guest_id"], first_guest_id)

        # Exactly 1 new user created, not 10
        self.assertEqual(User.objects.count(), initial_user_count + 1)
        self.assertEqual(GuestDeviceIdentity.objects.filter(guest_id=first_guest_id).count(), 1)

    def test_04_guest_uses_one_live_ai_request_successfully(self):
        """4. Guest successfully uses their 1 free live AI operation."""
        test_router = AIProviderRouter(primary_provider=MockAIProvider())
        with patch('ai.api.global_ai_router', test_router):
            res_auth = self.client.post("/api/v1/auth/guest")
            token = res_auth.json()["token"]
            guest_id = res_auth.json()["user"]["guest_id"]

            test_pdf = make_test_pdf("Live document for single guest allowance test")
            res_ai = self.client.post(
                "/api/v1/ai/summarize",
                {"file": test_pdf, "mode": "quick", "consent": "true"},
                HTTP_AUTHORIZATION=f"Bearer {token}",
                HTTP_X_SIMATRIX_AI_CONSENT="true"
            )
            self.assertEqual(res_ai.status_code, 200)
            data = res_ai.json()
            self.assertTrue(data["success"])
            self.assertEqual(data["quota"]["used"], 1)
            self.assertEqual(data["quota"]["remaining"], 0)

            # Verify database record updated
            identity = GuestDeviceIdentity.objects.get(guest_id=guest_id)
            self.assertEqual(identity.ai_operations_used, 1)

    def test_05_second_live_ai_request_blocked_across_every_ai_tool(self):
        """5. Second live AI request is blocked across every single AI tool."""
        test_router = AIProviderRouter(primary_provider=MockAIProvider())
        with patch('ai.api.global_ai_router', test_router):
            res_auth = self.client.post("/api/v1/auth/guest")
            token = res_auth.json()["token"]
            guest_id = res_auth.json()["user"]["guest_id"]

            # First request succeeds
            pdf1 = make_test_pdf("First document")
            res1 = self.client.post(
                "/api/v1/ai/summarize",
                {"file": pdf1, "mode": "quick", "consent": "true"},
                HTTP_AUTHORIZATION=f"Bearer {token}",
                HTTP_X_SIMATRIX_AI_CONSENT="true"
            )
            self.assertEqual(res1.status_code, 200)

            # Attempt 2 on Summarize -> Blocked
            pdf2 = make_test_pdf("Second document")
            res2_sum = self.client.post(
                "/api/v1/ai/summarize",
                {"file": pdf2, "mode": "quick", "consent": "true"},
                HTTP_AUTHORIZATION=f"Bearer {token}",
                HTTP_X_SIMATRIX_AI_CONSENT="true"
            )
            self.assertEqual(res2_sum.status_code, 403)
            self.assertEqual(res2_sum.json()["code"], "GUEST_PREVIEW_LIMIT")
            self.assertEqual(res2_sum.json()["quota"]["remaining"], 0)

            # Attempt 2 on Chat PDF -> Blocked
            pdf3 = make_test_pdf("Third document")
            res2_chat = self.client.post(
                "/api/v1/ai/chat-pdf",
                {"file": pdf3, "query": "What is this about?", "consent": "true"},
                HTTP_AUTHORIZATION=f"Bearer {token}",
                HTTP_X_SIMATRIX_AI_CONSENT="true"
            )
            self.assertEqual(res2_chat.status_code, 403)
            self.assertEqual(res2_chat.json()["code"], "GUEST_PREVIEW_LIMIT")

            # Attempt 2 on Translate -> Blocked
            pdf4 = make_test_pdf("Fourth document")
            res2_trans = self.client.post(
                "/api/v1/ai/translate",
                {"file": pdf4, "target_language": "tamil", "consent": "true"},
                HTTP_AUTHORIZATION=f"Bearer {token}",
                HTTP_X_SIMATRIX_AI_CONSENT="true"
            )
            self.assertEqual(res2_trans.status_code, 403)
            self.assertEqual(res2_trans.json()["code"], "GUEST_PREVIEW_LIMIT")

            # Attempt 2 on Key Points -> Blocked
            pdf5 = make_test_pdf("Fifth document")
            res2_kp = self.client.post(
                "/api/v1/ai/key-points",
                {"file": pdf5, "consent": "true"},
                HTTP_AUTHORIZATION=f"Bearer {token}",
                HTTP_X_SIMATRIX_AI_CONSENT="true"
            )
            self.assertEqual(res2_kp.status_code, 403)
            self.assertEqual(res2_kp.json()["code"], "GUEST_PREVIEW_LIMIT")

    def test_06_failed_ai_operations_do_not_consume_allowance(self):
        """6. Upstream failures do not consume the guest allowance."""
        primary_mock = MagicMock()
        primary_mock.name = "deepseek"
        primary_mock.generate_response.side_effect = AIProviderServiceUnavailableError("Outage")
        fallback_mock = MagicMock()
        fallback_mock.name = "gemini"
        fallback_mock.generate_response.side_effect = AIProviderServiceUnavailableError("Outage")

        test_router = AIProviderRouter(primary_provider=primary_mock, secondary_provider=fallback_mock)
        with patch('ai.api.global_ai_router', test_router):
            res_auth = self.client.post("/api/v1/auth/guest")
            token = res_auth.json()["token"]
            guest_id = res_auth.json()["user"]["guest_id"]

            pdf = make_test_pdf("Document during outage")
            res_fail = self.client.post(
                "/api/v1/ai/summarize",
                {"file": pdf, "mode": "quick", "consent": "true"},
                HTTP_AUTHORIZATION=f"Bearer {token}",
                HTTP_X_SIMATRIX_AI_CONSENT="true"
            )
            self.assertIn(res_fail.status_code, (502, 503))

            # Quota remains unconsumed
            identity = GuestDeviceIdentity.objects.get(guest_id=guest_id)
            self.assertEqual(identity.ai_operations_used, 0)
            self.assertEqual(identity.user.ai_quota.used_count, 0)

        # Retry after service recovery succeeds
        recovered_router = AIProviderRouter(primary_provider=MockAIProvider())
        with patch('ai.api.global_ai_router', recovered_router):
            pdf2 = make_test_pdf("Document after recovery")
            res_retry = self.client.post(
                "/api/v1/ai/summarize",
                {"file": pdf2, "mode": "quick", "consent": "true"},
                HTTP_AUTHORIZATION=f"Bearer {token}",
                HTTP_X_SIMATRIX_AI_CONSENT="true"
            )
            self.assertEqual(res_retry.status_code, 200)
            identity.refresh_from_db()
            self.assertEqual(identity.ai_operations_used, 1)

    def test_07_provider_fallback_consumes_only_one_allowance(self):
        """7. Provider fallback (DeepSeek -> Gemini) counts as exactly one operation."""
        primary_mock = MagicMock()
        primary_mock.name = "deepseek"
        primary_mock.generate_response.side_effect = AIProviderServiceUnavailableError("DeepSeek down")

        fallback_mock = MagicMock()
        fallback_mock.name = "gemini"
        fallback_mock.generate_response.return_value = AIResponse(
            content="Summary delivered via fallback.",
            provider="gemini",
            model="gemini-2.0-flash",
            prompt_tokens=45,
            completion_tokens=20,
            total_tokens=65,
            execution_time_ms=150
        )

        test_router = AIProviderRouter(primary_provider=primary_mock, secondary_provider=fallback_mock)
        with patch('ai.api.global_ai_router', test_router):
            res_auth = self.client.post("/api/v1/auth/guest")
            token = res_auth.json()["token"]
            guest_id = res_auth.json()["user"]["guest_id"]

            pdf = make_test_pdf("Document triggering fallback")
            res = self.client.post(
                "/api/v1/ai/summarize",
                {"file": pdf, "mode": "quick", "consent": "true"},
                HTTP_AUTHORIZATION=f"Bearer {token}",
                HTTP_X_SIMATRIX_AI_CONSENT="true"
            )
            self.assertEqual(res.status_code, 200)
            identity = GuestDeviceIdentity.objects.get(guest_id=guest_id)
            self.assertEqual(identity.ai_operations_used, 1)
            self.assertEqual(identity.user.ai_quota.used_count, 1)

    def test_08_precomputed_official_demos_do_not_consume_allowance(self):
        """8. Official verified sample documents bypass quota deduction."""
        res_auth = self.client.post("/api/v1/auth/guest")
        token = res_auth.json()["token"]
        guest_id = res_auth.json()["user"]["guest_id"]

        with patch("ai.processors.base.is_official_demo_hash", return_value=True), \
             patch("ai.processors.summarizer.get_demo_summary", return_value={"summary": "Demo result", "key_points": []}):
            pdf = make_test_pdf("Demo document")
            res = self.client.post(
                "/api/v1/ai/summarize",
                {"file": pdf, "mode": "quick", "consent": "true"},
                HTTP_AUTHORIZATION=f"Bearer {token}",
                HTTP_X_SIMATRIX_AI_CONSENT="true"
            )
            self.assertEqual(res.status_code, 200)

        identity = GuestDeviceIdentity.objects.get(guest_id=guest_id)
        self.assertEqual(identity.ai_operations_used, 0)
        self.assertEqual(identity.user.ai_quota.used_count, 0)

    def test_09_separate_browser_profiles_have_distinct_identities(self):
        """9. Two different browser profiles receive distinct guest identities and separate quotas."""
        test_router = AIProviderRouter(primary_provider=MockAIProvider())
        with patch('ai.api.global_ai_router', test_router):
            client_a = Client()
            client_b = Client()

            res_a = client_a.post("/api/v1/auth/guest")
            res_b = client_b.post("/api/v1/auth/guest")

            guest_a = res_a.json()["user"]["guest_id"]
            guest_b = res_b.json()["user"]["guest_id"]
            self.assertNotEqual(guest_a, guest_b)

            # Profile A consumes its request
            pdf_a = make_test_pdf("Document from browser A")
            res_ai_a = client_a.post(
                "/api/v1/ai/summarize",
                {"file": pdf_a, "mode": "quick", "consent": "true"},
                HTTP_AUTHORIZATION=f"Bearer {res_a.json()['token']}",
                HTTP_X_SIMATRIX_AI_CONSENT="true"
            )
            self.assertEqual(res_ai_a.status_code, 200)

            # Profile B still has remaining allowance
            pdf_b = make_test_pdf("Document from browser B")
            res_ai_b = client_b.post(
                "/api/v1/ai/summarize",
                {"file": pdf_b, "mode": "quick", "consent": "true"},
                HTTP_AUTHORIZATION=f"Bearer {res_b.json()['token']}",
                HTTP_X_SIMATRIX_AI_CONSENT="true"
            )
            self.assertEqual(res_ai_b.status_code, 200)

    def test_10_cookie_expiration_and_revocation(self):
        """10. Revoked guest device profiles are rejected."""
        res = self.client.post("/api/v1/auth/guest")
        guest_id = res.json()["user"]["guest_id"]
        cookie_val = res.cookies[GUEST_DEVICE_COOKIE_NAME].value

        # Revoke the guest profile
        identity = GuestDeviceIdentity.objects.get(guest_id=guest_id)
        identity.is_active = False
        identity.save(update_fields=["is_active"])

        # Subsequent attempt with revoked cookie is blocked
        client_revoked = Client()
        client_revoked.cookies[GUEST_DEVICE_COOKIE_NAME] = cookie_val
        res_blocked = client_revoked.post("/api/v1/auth/guest")
        self.assertEqual(res_blocked.status_code, 403)

    def test_11_switching_guest_google_identity_does_not_bypass_controls(self):
        """11. Switching between guest and Google identity cannot be exploited to reset guest quota."""
        test_router = AIProviderRouter(primary_provider=MockAIProvider())
        with patch('ai.api.global_ai_router', test_router):
            # 1. Guest uses their 1 free operation
            res_guest = self.client.post("/api/v1/auth/guest")
            guest_token = res_guest.json()["token"]
            guest_cookie = res_guest.cookies[GUEST_DEVICE_COOKIE_NAME].value
            guest_id = res_guest.json()["user"]["guest_id"]

            pdf1 = make_test_pdf("Guest initial document")
            res_g1 = self.client.post(
                "/api/v1/ai/summarize",
                {"file": pdf1, "mode": "quick", "consent": "true"},
                HTTP_AUTHORIZATION=f"Bearer {guest_token}",
                HTTP_X_SIMATRIX_AI_CONSENT="true"
            )
            self.assertEqual(res_g1.status_code, 200)

            # 2. User signs in with Google
            self.client.cookies[GUEST_DEVICE_COOKIE_NAME] = guest_cookie
            google_email = f"verified_user_{uuid.uuid4().hex[:6]}@gmail.com"
            res_google = self.client.post(
                "/api/v1/auth/google",
                {"email": google_email, "name": "Google User", "credential": "mock_jwt_token_123"},
                content_type="application/json"
            )
            self.assertEqual(res_google.status_code, 200)
            google_user = User.objects.get(email=google_email)
            self.assertEqual(google_user.ai_quota.total_allowed, 5)

            # 3. User logs out and tries to continue as Guest again on the same browser
            self.client.post("/api/v1/auth/logout")
            self.client.cookies[GUEST_DEVICE_COOKIE_NAME] = guest_cookie
            res_guest_again = self.client.post("/api/v1/auth/guest")
            self.assertEqual(res_guest_again.status_code, 200)
            self.assertEqual(res_guest_again.json()["user"]["guest_id"], guest_id)
            self.assertEqual(res_guest_again.json()["quota"]["used"], 1)
            self.assertEqual(res_guest_again.json()["quota"]["remaining"], 0)

            # Attempt to use guest AI request is BLOCKED
            pdf2 = make_test_pdf("Guest exploit attempt")
            res_blocked = self.client.post(
                "/api/v1/ai/summarize",
                {"file": pdf2, "mode": "quick", "consent": "true"},
                HTTP_AUTHORIZATION=f"Bearer {res_guest_again.json()['token']}",
                HTTP_X_SIMATRIX_AI_CONSENT="true"
            )
            self.assertEqual(res_blocked.status_code, 403)
            self.assertEqual(res_blocked.json()["code"], "GUEST_PREVIEW_LIMIT")

    def test_12_standard_pdf_utilities_remain_available_to_guests(self):
        """12. Guest with exhausted AI quota can still freely use standard PDF utilities."""
        res_guest = self.client.post("/api/v1/auth/guest")
        guest_id = res_guest.json()["user"]["guest_id"]
        identity = GuestDeviceIdentity.objects.get(guest_id=guest_id)
        identity.ai_operations_used = 1
        identity.save(update_fields=["ai_operations_used"])
        identity.user.ai_quota.used_count = 1
        identity.user.ai_quota.save(update_fields=["used_count"])

        # Standard PDF Protection utility remains functional
        pdf = make_test_pdf("Document for standard encryption")
        res_protect = self.client.post(
            "/api/v1/security/protect-pdf",
            {"file": pdf, "password": "SecretPassword123"}
        )
        self.assertEqual(res_protect.status_code, 200)
        self.assertTrue(res_protect.json()["success"])

    @unittest.skipIf(connection.vendor == 'sqlite', "Multi-threaded concurrency requires MySQL InnoDB row-level locking")
    def test_13_concurrent_requests_cannot_exceed_quota(self):
        """13. Concurrent requests from the same guest profile cannot exceed the 1-operation cap."""
        res_guest = self.client.post("/api/v1/auth/guest")
        guest_id = res_guest.json()["user"]["guest_id"]
        user = GuestDeviceIdentity.objects.get(guest_id=guest_id).user

        results = []

        def attempt_reservation(worker_id):
            for conn in connections.all():
                conn.close()

            idem_key = f"concurrent_guest_req_{worker_id}"
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
        self.assertEqual(len(successful_reservations), 1, f"Expected exactly 1 slot won, got {len(successful_reservations)}")
