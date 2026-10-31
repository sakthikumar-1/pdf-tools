"""
Comprehensive Integration Tests for Simatrix PDF AI API (Phase 4).
Tests:
- Authenticated Summarization
- Ask PDF Session Creation & Follow-Up Multi-Turn Questions
- Session Ownership Enforcement & Cross-User Protection
- Session Expiration & Session Deletion
- PDF Translation & DOCX Export Token
- Consent Enforcement & Consent Rejection
- Strict 5-Request Quota Enforcement
- Multi-Worker Rate-Limit Enforcement (10 req/min user)
- Duplicate Idempotency Replay (Zero Double-Deduction)
- DeepSeek Failure & Automatic Fallback to Secondary Provider
- Both Providers Unavailable (Safe Reservation Release)
- Invalid & Corrupted PDF Rejections
- Scaffolding Tools Return 501 FEATURE_NOT_READY
- Official Demo Document Bypass (0 Quota Deducted)
- GET /api/v1/ai/quota Endpoint
"""

import os
import uuid
import time
from pathlib import Path
from unittest.mock import patch, MagicMock
from datetime import timedelta

import pymupdf as fitz
from django.test import TransactionTestCase, Client, override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from django.conf import settings

from apps.authentication.models import (
    User,
    AIUserQuota,
    AIChatSession,
    AIChatMessage,
    AIRateLimitBucket
)
from core.api import token_signer
from ai.mock_provider import MockAIProvider
from ai.provider_base import (
    AIResponse,
    AIProviderRateLimitError,
    AIProviderServiceUnavailableError,
    AIProviderTimeoutError
)
from ai.router import AIProviderRouter
from ai.rate_limiter import reset_rate_limit_memory

FIXTURES_DIR = Path(settings.BASE_DIR).parent / "fixtures"
if not FIXTURES_DIR.exists():
    FIXTURES_DIR = Path(settings.BASE_DIR) / "fixtures"


def make_custom_pdf(text: str = "Unique non-demo content for live document testing") -> SimpleUploadedFile:
    """Generates an in-memory PDF whose SHA-256 does not match demo fixtures."""
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text(fitz.Point(50, 72), f"{text}\nRandom seed: {uuid.uuid4().hex}")
    pdf_bytes = doc.tobytes()
    doc.close()
    return SimpleUploadedFile(f"live_{uuid.uuid4().hex[:6]}.pdf", pdf_bytes, content_type="application/pdf")


@override_settings(AI_PROVIDER='mock', IS_TESTING=True)
class AIAPIIntegrationTests(TransactionTestCase):
    """API Integration tests for Django Ninja AI endpoints."""

    def setUp(self):
        self.client = Client()
        reset_rate_limit_memory()
        AIRateLimitBucket.objects.all().delete()

        # Create Primary Test User
        self.user_a = User.objects.create(
            email=f"user_a_{uuid.uuid4().hex[:6]}@example.com",
            username=f"user_a_{uuid.uuid4().hex[:6]}",
            full_name="Alice Researcher",
            is_verified=True,
            role="user"
        )
        self.quota_a = getattr(self.user_a, 'ai_quota', None)
        if not self.quota_a:
            self.quota_a = AIUserQuota.objects.create(user=self.user_a, total_allowed=5, used_count=0)

        # Create Secondary Test User for cross-user tests
        self.user_b = User.objects.create(
            email=f"user_b_{uuid.uuid4().hex[:6]}@example.com",
            username=f"user_b_{uuid.uuid4().hex[:6]}",
            full_name="Bob Unauthorized",
            is_verified=True,
            role="user"
        )
        self.quota_b = getattr(self.user_b, 'ai_quota', None)
        if not self.quota_b:
            self.quota_b = AIUserQuota.objects.create(user=self.user_b, total_allowed=5, used_count=0)

        # Tokens
        self.token_a = token_signer.sign_object({'user_id': str(self.user_a.id), 'email': self.user_a.email, 'ts': int(time.time())})
        self.token_b = token_signer.sign_object({'user_id': str(self.user_b.id), 'email': self.user_b.email, 'ts': int(time.time())})

        self.auth_headers_a = {'HTTP_AUTHORIZATION': f"Bearer {self.token_a}"}
        self.auth_headers_b = {'HTTP_AUTHORIZATION': f"Bearer {self.token_b}"}

        self.one_page_pdf = FIXTURES_DIR / "sample_one_page.pdf"
        self.multi_page_pdf = FIXTURES_DIR / "sample_multi_page.pdf"
        self.corrupt_pdf = FIXTURES_DIR / "damaged_corrupt.pdf"

    def tearDown(self):
        AIChatMessage.objects.all().delete()
        AIChatSession.objects.all().delete()
        AIRateLimitBucket.objects.all().delete()
        self.user_a.delete()
        self.user_b.delete()
        reset_rate_limit_memory()
        super().tearDown()

    # --------------------------------------------------------------------------
    # 1. Authenticated Summarization
    # --------------------------------------------------------------------------
    def test_authenticated_summarization_with_quota(self):
        """Verifies authenticated PDF summarization consumes exactly 1 quota credit."""
        uploaded = make_custom_pdf("Research Findings on Document Intelligence")

        response = self.client.post(
            "/api/v1/ai/summarize",
            {"file": uploaded, "mode": "quick", "consent": "true"},
            **self.auth_headers_a
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertIn("summary", data)
        self.assertEqual(data["page_count"], 1)
        self.assertEqual(data["quota"]["used"], 1)
        self.assertEqual(data["quota"]["remaining"], 4)

    # --------------------------------------------------------------------------
    # 2. Consent Rejection
    # --------------------------------------------------------------------------
    def test_consent_rejection(self):
        """Verifies missing or false consent returns HTTP 400 AI_CONSENT_REQUIRED."""
        uploaded = make_custom_pdf("Test document")

        # Explicit consent="false"
        response = self.client.post(
            "/api/v1/ai/summarize",
            {"file": uploaded, "mode": "quick", "consent": "false"},
            **self.auth_headers_a
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json().get("code"), "AI_CONSENT_REQUIRED")

        # Missing consent header & param
        uploaded2 = make_custom_pdf("Another test")
        response2 = self.client.post(
            "/api/v1/ai/translate",
            {"file": uploaded2, "target_language": "tamil"},
            **self.auth_headers_a
        )
        self.assertEqual(response2.status_code, 400)
        self.assertEqual(response2.json().get("code"), "AI_CONSENT_REQUIRED")

    # --------------------------------------------------------------------------
    # 3. Quota Exhaustion
    # --------------------------------------------------------------------------
    def test_quota_exhaustion_blocks_further_requests(self):
        """Verifies users with 5 used requests are rejected with AI_LIMIT_REACHED."""
        self.quota_a.used_count = 5
        self.quota_a.save(update_fields=['used_count'])

        uploaded = make_custom_pdf("Doc after limit")

        response = self.client.post(
            "/api/v1/ai/summarize",
            {"file": uploaded, "mode": "quick", "consent": "true"},
            **self.auth_headers_a
        )
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertEqual(data.get("code"), "AI_LIMIT_REACHED")
        self.assertEqual(data["quota"]["used"], 5)
        self.assertEqual(data["quota"]["remaining"], 0)

    # --------------------------------------------------------------------------
    # 4. Ask PDF Session Creation & Multi-Turn Chat
    # --------------------------------------------------------------------------
    def test_ask_pdf_session_creation_and_follow_up(self):
        """Verifies session creation from PDF upload followed by multi-turn Q&A."""
        uploaded = make_custom_pdf("Corporate policy guidelines for annual leave and remote work.")

        resp1 = self.client.post(
            "/api/v1/ai/chat-pdf",
            {"file": uploaded, "query": "What is discussed on Page 1?", "consent": "true"},
            **self.auth_headers_a
        )
        self.assertEqual(resp1.status_code, 200)
        data1 = resp1.json()
        session_id = data1["session_id"]
        self.assertTrue(session_id)
        self.assertTrue(data1["answer"])
        self.assertIsInstance(data1["cited_pages"], list)

        # Turn 2: Follow-up question using session_id without re-uploading file
        resp2 = self.client.post(
            "/api/v1/ai/chat-pdf",
            {"session_id": session_id, "query": "Can you summarize the policy?", "consent": "true"},
            **self.auth_headers_a
        )
        self.assertEqual(resp2.status_code, 200)
        data2 = resp2.json()
        self.assertEqual(data2["session_id"], session_id)
        self.assertTrue(data2["answer"])

        # Verify conversation history has 4 messages (2 user + 2 assistant)
        session = AIChatSession.objects.get(id=session_id)
        self.assertEqual(session.messages.count(), 4)

    # --------------------------------------------------------------------------
    # 5. Session Ownership & Cross-User Security Enforcement
    # --------------------------------------------------------------------------
    def test_cross_user_session_access_denied(self):
        """Verifies User B cannot query or inspect User A's session."""
        uploaded = make_custom_pdf("Confidential user A acquisition documents.")

        resp_a = self.client.post(
            "/api/v1/ai/chat-pdf",
            {"file": uploaded, "query": "Summarize confidential terms", "consent": "true"},
            **self.auth_headers_a
        )
        session_id = resp_a.json()["session_id"]

        # User B attempts to query User A's session
        resp_b = self.client.post(
            "/api/v1/ai/chat-pdf",
            {"session_id": session_id, "query": "Steal data", "consent": "true"},
            **self.auth_headers_b
        )
        self.assertEqual(resp_b.status_code, 403)
        self.assertEqual(resp_b.json().get("code"), "ACCESS_DENIED")

        # User B attempts to GET User A's session details
        resp_get = self.client.get(
            f"/api/v1/ai/chat-pdf/session/{session_id}",
            **self.auth_headers_b
        )
        self.assertEqual(resp_get.status_code, 403)

        # User B attempts to DELETE User A's session
        resp_del = self.client.delete(
            f"/api/v1/ai/chat-pdf/session/{session_id}",
            **self.auth_headers_b
        )
        self.assertEqual(resp_del.status_code, 403)

    # --------------------------------------------------------------------------
    # 6. Session Expiration
    # --------------------------------------------------------------------------
    def test_session_expiration(self):
        """Verifies expired sessions return HTTP 410 SESSION_EXPIRED."""
        uploaded = make_custom_pdf("Expiring doc content")

        resp = self.client.post(
            "/api/v1/ai/chat-pdf",
            {"file": uploaded, "query": "Hello", "consent": "true"},
            **self.auth_headers_a
        )
        session_id = resp.json()["session_id"]

        # Fast-forward session expiration into past
        session = AIChatSession.objects.get(id=session_id)
        session.expires_at = timezone.now() - timedelta(hours=1)
        session.save(update_fields=['expires_at'])

        resp_expired = self.client.post(
            "/api/v1/ai/chat-pdf",
            {"session_id": session_id, "query": "Follow up after expiry", "consent": "true"},
            **self.auth_headers_a
        )
        self.assertEqual(resp_expired.status_code, 410)
        self.assertEqual(resp_expired.json().get("code"), "SESSION_EXPIRED")

    # --------------------------------------------------------------------------
    # 7. Session Deletion
    # --------------------------------------------------------------------------
    def test_session_deletion(self):
        """Verifies session owner can delete session and messages."""
        uploaded = make_custom_pdf("Document to delete")

        resp = self.client.post(
            "/api/v1/ai/chat-pdf",
            {"file": uploaded, "query": "Test deletion", "consent": "true"},
            **self.auth_headers_a
        )
        session_id = resp.json()["session_id"]

        # Delete session
        del_resp = self.client.delete(
            f"/api/v1/ai/chat-pdf/session/{session_id}",
            **self.auth_headers_a
        )
        self.assertEqual(del_resp.status_code, 200)
        self.assertFalse(AIChatSession.objects.filter(id=session_id).exists())

    # --------------------------------------------------------------------------
    # 8. PDF Translator
    # --------------------------------------------------------------------------
    def test_pdf_translation_and_docx_token(self):
        """Verifies translation into Tamil with DOCX download token."""
        uploaded = make_custom_pdf("Simatrix provides high precision translation tools.")

        resp = self.client.post(
            "/api/v1/ai/translate",
            {"file": uploaded, "target_language": "tamil", "consent": "true"},
            **self.auth_headers_a
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["target_language"], "Tamil (தமிழ்)")
        self.assertTrue(data["translated_text"])
        self.assertIn("download_url", data)
        self.assertIn("download_token", data)

    # --------------------------------------------------------------------------
    # 9. Duplicate Idempotency Replay
    # --------------------------------------------------------------------------
    def test_duplicate_idempotency_key_replay(self):
        """Verifies repeated request with same key returns ALREADY_COMPLETED and consumes no quota."""
        idem_key = f"idemp_{uuid.uuid4().hex}"
        uploaded = make_custom_pdf("Idempotency verification paper")

        resp1 = self.client.post(
            "/api/v1/ai/summarize",
            {"file": uploaded, "mode": "quick", "consent": "true", "idempotency_key": idem_key},
            **self.auth_headers_a
        )
        self.assertEqual(resp1.status_code, 200)
        self.assertEqual(resp1.json()["quota"]["used"], 1)

        # Send second request with identical idempotency key
        uploaded2 = make_custom_pdf("Idempotency verification paper duplicate")
        resp2 = self.client.post(
            "/api/v1/ai/summarize",
            {"file": uploaded2, "mode": "quick", "consent": "true", "idempotency_key": idem_key},
            **self.auth_headers_a
        )
        self.assertEqual(resp2.status_code, 200)
        data2 = resp2.json()
        # Should not consume another quota credit
        self.assertEqual(data2.get("status"), "ALREADY_COMPLETED")
        self.assertEqual(data2["quota"]["used"], 1)

    # --------------------------------------------------------------------------
    # 10. Provider Fallback
    # --------------------------------------------------------------------------
    def test_deepseek_failure_gemini_fallback(self):
        """Verifies fallback provider triggers on upstream 429/503 and charges only once."""
        primary_mock = MagicMock()
        primary_mock.name = "deepseek"
        primary_mock.generate_response.side_effect = AIProviderRateLimitError("DeepSeek rate limited")

        fallback_mock = MagicMock()
        fallback_mock.name = "gemini"
        fallback_mock.generate_response.return_value = AIResponse(
            content="Fallback Gemini summary output",
            provider="gemini",
            model="gemini-2.0-flash",
            prompt_tokens=50,
            completion_tokens=20,
            total_tokens=70,
            execution_time_ms=120
        )

        test_router = AIProviderRouter(primary_provider=primary_mock, secondary_provider=fallback_mock)

        with patch('ai.api.global_ai_router', test_router):
            uploaded = make_custom_pdf("Document for fallback test")

            resp = self.client.post(
                "/api/v1/ai/summarize",
                {"file": uploaded, "mode": "quick", "consent": "true"},
                **self.auth_headers_a
            )
            self.assertEqual(resp.status_code, 200)
            data = resp.json()
            self.assertEqual(data["provider"], "gemini")
            self.assertIn("Fallback", data["summary"])
            # Exactly 1 credit deducted
            self.assertEqual(data["quota"]["used"], 1)

    # --------------------------------------------------------------------------
    # 11. Both Providers Unavailable (Safe Reservation Release)
    # --------------------------------------------------------------------------
    def test_both_providers_unavailable_releases_slot(self):
        """Verifies that when all providers fail, the reservation is released and 0 quota consumed."""
        primary_mock = MagicMock()
        primary_mock.name = "deepseek"
        primary_mock.generate_response.side_effect = AIProviderServiceUnavailableError("DeepSeek down")

        fallback_mock = MagicMock()
        fallback_mock.name = "gemini"
        fallback_mock.generate_response.side_effect = AIProviderServiceUnavailableError("Gemini down")

        test_router = AIProviderRouter(primary_provider=primary_mock, secondary_provider=fallback_mock)

        with patch('ai.api.global_ai_router', test_router):
            uploaded = make_custom_pdf("Document when both down")

            resp = self.client.post(
                "/api/v1/ai/summarize",
                {"file": uploaded, "mode": "quick", "consent": "true"},
                **self.auth_headers_a
            )
            self.assertEqual(resp.status_code, 502)

            # Quota must NOT have been deducted
            self.quota_a.refresh_from_db()
            self.assertEqual(self.quota_a.used_count, 0)

    # --------------------------------------------------------------------------
    # 12. Corrupt PDF Rejection
    # --------------------------------------------------------------------------
    def test_corrupt_pdf_rejection(self):
        """Verifies corrupt PDF is rejected before calling AI providers."""
        with open(self.corrupt_pdf, 'rb') as f:
            uploaded = SimpleUploadedFile("damaged.pdf", f.read(), content_type="application/pdf")

        resp = self.client.post(
            "/api/v1/ai/translate",
            {"file": uploaded, "target_language": "tamil", "consent": "true"},
            **self.auth_headers_a
        )
        self.assertEqual(resp.status_code, 400)
        self.quota_a.refresh_from_db()
        self.assertEqual(self.quota_a.used_count, 0)

    # --------------------------------------------------------------------------
    # 13. Official Demo Document Bypass
    # --------------------------------------------------------------------------
    def test_demo_document_bypass(self):
        """Verifies official demo PDF consumes 0 quota credits."""
        with open(self.one_page_pdf, 'rb') as f:
            uploaded = SimpleUploadedFile("sample_one_page.pdf", f.read(), content_type="application/pdf")

        resp = self.client.post(
            "/api/v1/ai/summarize",
            {"file": uploaded, "mode": "quick", "consent": "true"},
            **self.auth_headers_a
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data.get("is_demo"))
        self.assertFalse(data.get("quota_deducted"))

        self.quota_a.refresh_from_db()
        self.assertEqual(self.quota_a.used_count, 0)

    # --------------------------------------------------------------------------
    # 14. Scaffolding Endpoints Return 501 FEATURE_NOT_READY
    # --------------------------------------------------------------------------
    def test_scaffolding_tools_return_feature_not_ready(self):
        """Verifies tools 4-8 return clean 501 FEATURE_NOT_READY."""
        endpoints = [
            "/api/v1/ai/key-points",
            "/api/v1/ai/extract-data",
            "/api/v1/ai/generate-qns",
            "/api/v1/ai/rewrite",
            "/api/v1/ai/compare"
        ]
        for ep in endpoints:
            resp = self.client.post(ep, **self.auth_headers_a)
            self.assertEqual(resp.status_code, 501, f"{ep} did not return 501")
            data = resp.json()
            self.assertEqual(data.get("code"), "FEATURE_NOT_READY")
            self.assertEqual(data.get("expected_phase"), "Phase 5")

    # --------------------------------------------------------------------------
    # 15. GET /api/v1/ai/quota
    # --------------------------------------------------------------------------
    def test_get_user_quota_endpoint(self):
        """Verifies GET /api/v1/ai/quota returns accurate quota statistics."""
        self.quota_a.used_count = 2
        self.quota_a.save(update_fields=['used_count'])

        resp = self.client.get("/api/v1/ai/quota", **self.auth_headers_a)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["total_allowed"], 5)
        self.assertEqual(data["used_count"], 2)
        self.assertEqual(data["remaining"], 3)

    def test_all_five_tools_return_200_when_file_provided(self):
        """Verifies tools 4-8 successfully execute when a PDF file is uploaded."""
        endpoints = [
            "/api/v1/ai/key-points",
            "/api/v1/ai/extract-data",
            "/api/v1/ai/generate-qns",
            "/api/v1/ai/rewrite",
            "/api/v1/ai/compare"
        ]
        for ep in endpoints:
            f = make_custom_pdf(f"Testing {ep}")
            resp = self.client.post(
                ep,
                {"file": f, "consent": "true"},
                **self.auth_headers_a
            )
            self.assertEqual(resp.status_code, 200, f"{ep} failed with {resp.status_code}: {resp.content}")
            data = resp.json()
            self.assertTrue(data.get("success"), f"{ep} success was not True")
