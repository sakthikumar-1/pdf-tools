"""
Comprehensive Unit & Integration Test Suite for Simatrix AI Explicit Consent Architecture.
Verifies:
1. Rejection of requests lacking stored DB consent and explicit param (even if header is spoofed).
2. Explicit POST /api/v1/ai/consent endpoint recording timestamp, identity, and policy version.
3. Verification that stored consent permits subsequent operations.
4. Verification that policy version mismatches invalidate consent.
5. Explicit consent revocation via POST /api/v1/ai/consent (consent=False).
"""

import json
import uuid
from unittest.mock import patch, MagicMock

import pymupdf as fitz
from django.test import TestCase, Client
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone

from apps.authentication.models import User, AIUserQuota
from ai.provider_base import AIResponse


class AIConsentLifecycleTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            email=f"consent_test_{uuid.uuid4().hex[:8]}@example.com",
            full_name="Consent Tester",
            is_active=True
        )
        self.quota = self.user.ai_quota
        self.quota.total_allowed = 5
        self.quota.used_count = 0
        self.quota.consent_given_at = None
        self.quota.consent_policy_version = ""
        self.quota.save()
        # Sign in token
        from core.api import token_signer
        import time
        self.token = token_signer.sign_object({
            "user_id": str(self.user.id),
            "email": self.user.email,
            "ts": int(time.time())
        })
        self.auth_headers = {
            "HTTP_AUTHORIZATION": f"Bearer {self.token}"
        }

        # Mock AI Router
        self.mock_router_patcher = patch("ai.api.global_ai_router")
        self.mock_router = self.mock_router_patcher.start()
        self.mock_router.execute.return_value = (
            AIResponse(
                content="Grounded document summary.",
                provider="deepseek",
                model="deepseek-chat",
                prompt_tokens=40,
                completion_tokens=20,
                total_tokens=60,
                execution_time_ms=120
            ),
            None
        )

    def tearDown(self):
        self.mock_router_patcher.stop()

    def _create_sample_pdf(self) -> SimpleUploadedFile:
        doc = fitz.open()
        page = doc.new_page(width=300, height=300)
        page.insert_text((50, 50), "Document content for consent validation testing.")
        pdf_bytes = doc.tobytes()
        doc.close()
        return SimpleUploadedFile("consent_sample.pdf", pdf_bytes, content_type="application/pdf")

    def test_01_request_rejected_without_stored_consent_or_param(self):
        """Verifies an unconsented user without stored consent record receives 400 AI_CONSENT_REQUIRED."""
        pdf = self._create_sample_pdf()
        res = self.client.post(
            "/api/v1/ai/summarize",
            {"file": pdf, "mode": "quick"},
            **self.auth_headers
        )
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json().get("code"), "AI_CONSENT_REQUIRED")

    def test_02_spoofed_header_alone_rejected_without_stored_consent(self):
        """Backend must not blindly trust X-Simatrix-AI-Consent header if no DB consent exists."""
        pdf = self._create_sample_pdf()
        res = self.client.post(
            "/api/v1/ai/summarize",
            {"file": pdf, "mode": "quick"},
            HTTP_X_SIMATRIX_AI_CONSENT="true",
            **self.auth_headers
        )
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json().get("code"), "AI_CONSENT_REQUIRED")

    def test_03_record_consent_endpoint_persists_in_database(self):
        """Calling POST /api/v1/ai/consent records consent, timestamp, and policy version."""
        payload = json.dumps({"consent": True, "policy_version": "2026.1"})
        res = self.client.post(
            "/api/v1/ai/consent",
            data=payload,
            content_type="application/json",
            **self.auth_headers
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertTrue(data["consent_given"])
        self.assertEqual(data["consent_policy_version"], "2026.1")
        self.assertIsNotNone(data["timestamp"])

        # Check DB
        self.quota.refresh_from_db()
        self.assertIsNotNone(self.quota.consent_given_at)
        self.assertEqual(self.quota.consent_policy_version, "2026.1")

    def test_04_stored_consent_permits_subsequent_ai_operations(self):
        """Once consent is stored in DB, future operations succeed without resending consent param."""
        # 1. Record consent
        self.client.post(
            "/api/v1/ai/consent",
            data=json.dumps({"consent": True, "policy_version": "2026.1"}),
            content_type="application/json",
            **self.auth_headers
        )

        # 2. Call AI without consent form param
        pdf = self._create_sample_pdf()
        res = self.client.post(
            "/api/v1/ai/summarize",
            {"file": pdf, "mode": "quick"},
            **self.auth_headers
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json().get("success"))

    def test_05_policy_version_mismatch_invalidates_consent(self):
        """If user accepted 2026.1, a request with header requiring 2027.1 is rejected."""
        # Record consent for 2026.1
        self.client.post(
            "/api/v1/ai/consent",
            data=json.dumps({"consent": True, "policy_version": "2026.1"}),
            content_type="application/json",
            **self.auth_headers
        )

        # Send request requiring updated policy version 2027.1
        pdf = self._create_sample_pdf()
        res = self.client.post(
            "/api/v1/ai/summarize",
            {"file": pdf, "mode": "quick"},
            HTTP_X_SIMATRIX_POLICY_VERSION="2027.1",
            **self.auth_headers
        )
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json().get("code"), "AI_CONSENT_REQUIRED")

    def test_06_revoking_consent_blocks_ai_operations(self):
        """Calling POST /api/v1/ai/consent with consent=False revokes DB consent."""
        # 1. Record consent
        self.client.post(
            "/api/v1/ai/consent",
            data=json.dumps({"consent": True, "policy_version": "2026.1"}),
            content_type="application/json",
            **self.auth_headers
        )

        # 2. Revoke consent
        res_revoke = self.client.post(
            "/api/v1/ai/consent",
            data=json.dumps({"consent": False}),
            content_type="application/json",
            **self.auth_headers
        )
        self.assertEqual(res_revoke.status_code, 200)
        self.assertFalse(res_revoke.json()["consent_given"])

        # Check DB
        self.quota.refresh_from_db()
        self.assertIsNone(self.quota.consent_given_at)

        # 3. Call AI -> rejected
        pdf = self._create_sample_pdf()
        res = self.client.post(
            "/api/v1/ai/summarize",
            {"file": pdf, "mode": "quick"},
            **self.auth_headers
        )
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json().get("code"), "AI_CONSENT_REQUIRED")
