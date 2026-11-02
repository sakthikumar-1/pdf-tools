import uuid
import time
from django.test import TestCase, Client, override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from django.core.cache import cache
from unittest.mock import patch

from apps.authentication.models import User, AIUserQuota, AIRateLimitBucket, GuestDeviceIdentity
from apps.authentication.guest_service import GUEST_DEVICE_COOKIE_NAME
from core.api import token_signer
from ai.provider_base import AIResponse, AIProviderRateLimitError
from ai.mock_provider import MockAIProvider
from ai.router import AIProviderRouter
from ai.rate_limiter import reset_rate_limit_memory
import fitz


def create_unique_pdf(text: str) -> SimpleUploadedFile:
    doc = fitz.open()
    p = doc.new_page()
    p.insert_text((72, 72), f"{text} - {uuid.uuid4().hex}")
    pdf_bytes = doc.tobytes()
    doc.close()
    return SimpleUploadedFile(f"{uuid.uuid4().hex[:8]}.pdf", pdf_bytes, content_type="application/pdf")


@override_settings(AI_PROVIDER='mock', IS_TESTING=True)
class AIQuotaEnforcementRemediationTests(TestCase):
    """
    Forensic remediation tests for Issue 1: Quota Bypass & Shared Multi-Tool Limits:
    - Requests 1-5: HTTP 200 allowed.
    - Request 6: HTTP 403 AI_LIMIT_REACHED.
    - Request 7: HTTP 403 AI_LIMIT_REACHED.
    - Failed requests: zero credits consumed.
    - DeepSeek-to-Gemini fallback: exactly one credit maximum.
    - Duplicate idempotency key: cached response, zero double billing.
    - Shared quota across all 8 AI tools for registered users.
    - Shared 1-request preview cap across all 8 AI tools for guest devices.
    - Direct endpoint calls cannot bypass either quota.
    """

    def setUp(self):
        cache.clear()
        AIRateLimitBucket.objects.all().delete()
        reset_rate_limit_memory()
        self.client = Client(REMOTE_ADDR=f"10.88.{uuid.uuid4().int % 250 + 1}.{uuid.uuid4().int % 250 + 1}")

        # Dedicated test user with standard 5-request allowance
        self.test_user = User.objects.create(
            email=f"quota_audit_{uuid.uuid4().hex[:6]}@example.com",
            full_name="Quota Audit Tester",
            role="user"
        )
        self.user_quota, _ = AIUserQuota.objects.get_or_create(
            user=self.test_user,
            defaults={"total_allowed": 5, "used_count": 0}
        )
        self.user_quota.total_allowed = 5
        self.user_quota.used_count = 0
        self.user_quota.consent_given_at = timezone.now()
        self.user_quota.consent_policy_version = "2026.1"
        self.user_quota.save()

        self.token = token_signer.sign_object({
            'user_id': str(self.test_user.id),
            'email': self.test_user.email,
            'ts': int(time.time())
        })
        self.auth_headers = {'HTTP_AUTHORIZATION': f"Bearer {self.token}"}

    def test_strict_5_request_quota_boundary(self):
        """Verifies requests 1-5 succeed, and requests 6 and 7 are rejected with HTTP 403 AI_LIMIT_REACHED."""
        for i in range(1, 6):
            pdf = create_unique_pdf(f"Unique test content for request {i}")
            resp = self.client.post(
                "/api/v1/ai/summarize",
                {"file": pdf, "mode": "quick", "consent": "true"},
                **self.auth_headers
            )
            self.assertEqual(resp.status_code, 200, f"Request {i} failed: {resp.content}")
            data = resp.json()
            self.assertTrue(data.get("success"))
            self.assertEqual(data.get("quota", {}).get("used"), i)
            self.assertEqual(data.get("quota", {}).get("remaining"), 5 - i)

        # 6th request: must be blocked with HTTP 403
        pdf6 = create_unique_pdf("6th request over the limit")
        resp6 = self.client.post(
            "/api/v1/ai/summarize",
            {"file": pdf6, "mode": "quick", "consent": "true"},
            **self.auth_headers
        )
        self.assertEqual(resp6.status_code, 403)
        data6 = resp6.json()
        self.assertFalse(data6.get("success"))
        self.assertEqual(data6.get("code"), "AI_LIMIT_REACHED")
        self.assertEqual(data6.get("quota", {}).get("used"), 5)
        self.assertEqual(data6.get("quota", {}).get("remaining"), 0)

        # 7th request: also blocked with HTTP 403
        pdf7 = create_unique_pdf("7th request over the limit")
        resp7 = self.client.post(
            "/api/v1/ai/summarize",
            {"file": pdf7, "mode": "quick", "consent": "true"},
            **self.auth_headers
        )
        self.assertEqual(resp7.status_code, 403)
        data7 = resp7.json()
        self.assertEqual(data7.get("code"), "AI_LIMIT_REACHED")

    def test_failed_requests_consume_zero_credits(self):
        """Verifies that upstream AI failures result in zero quota deduction."""
        initial_used = self.user_quota.used_count
        pdf = create_unique_pdf("Document doomed to fail upstream")

        failing_mock = MockAIProvider(simulate_error="rate_limit")
        test_router = AIProviderRouter(primary_provider=failing_mock, secondary_provider=None)

        with patch('ai.api.global_ai_router', test_router):
            resp = self.client.post(
                "/api/v1/ai/summarize",
                {"file": pdf, "mode": "quick", "consent": "true"},
                **self.auth_headers
            )
            self.assertEqual(resp.status_code, 429)

        # Quota must be completely unchanged
        self.user_quota.refresh_from_db()
        self.assertEqual(self.user_quota.used_count, initial_used)

    def test_primary_to_secondary_fallback_consumes_at_most_one_credit(self):
        """Verifies that DeepSeek failing and falling back to Gemini only deducts 1 credit total."""
        initial_used = self.user_quota.used_count
        pdf = create_unique_pdf("Document triggering fallback")

        primary_mock = MockAIProvider(simulate_error="rate_limit")
        secondary_mock = MockAIProvider()

        test_router = AIProviderRouter(primary_provider=primary_mock, secondary_provider=secondary_mock)

        with patch('ai.api.global_ai_router', test_router):
            resp = self.client.post(
                "/api/v1/ai/summarize",
                {"file": pdf, "mode": "quick", "consent": "true"},
                **self.auth_headers
            )
            self.assertEqual(resp.status_code, 200)
            data = resp.json()
            self.assertTrue(data.get("success"))

        # Quota must be exactly +1
        self.user_quota.refresh_from_db()
        self.assertEqual(self.user_quota.used_count, initial_used + 1)

    def test_duplicate_idempotency_key_zero_double_billing(self):
        """Verifies that replaying a request with the same idempotency key does not deduct extra credits."""
        initial_used = self.user_quota.used_count
        pdf1 = create_unique_pdf("Original document with idempotency key")
        idem_key = f"audit_idem_{uuid.uuid4().hex}"

        resp1 = self.client.post(
            "/api/v1/ai/summarize",
            {"file": pdf1, "mode": "quick", "consent": "true", "idempotency_key": idem_key},
            **self.auth_headers
        )
        self.assertEqual(resp1.status_code, 200)

        self.user_quota.refresh_from_db()
        self.assertEqual(self.user_quota.used_count, initial_used + 1)

        # Replay with same idempotency key
        pdf2 = create_unique_pdf("Replay document with identical idempotency key")
        resp2 = self.client.post(
            "/api/v1/ai/summarize",
            {"file": pdf2, "mode": "quick", "consent": "true", "idempotency_key": idem_key},
            **self.auth_headers
        )
        self.assertEqual(resp2.status_code, 200)
        data2 = resp2.json()
        self.assertEqual(data2.get("status"), "ALREADY_COMPLETED")

        # Quota must NOT have been incremented again
        self.user_quota.refresh_from_db()
        self.assertEqual(self.user_quota.used_count, initial_used + 1)

    def test_five_registered_user_credits_shared_across_all_eight_ai_tools(self):
        """
        Verifies that the 5 registered-user credits are shared across AI tools:
        Consuming credits on different tools exhausts the shared pool, and subsequent
        requests across ANY of the eight tools are blocked with HTTP 403 AI_LIMIT_REACHED.
        """
        # Consume credit 1 with Summarizer
        pdf1 = create_unique_pdf("Shared test 1 - Summarizer")
        r1 = self.client.post(
            "/api/v1/ai/summarize",
            {"file": pdf1, "mode": "quick", "consent": "true"},
            **self.auth_headers
        )
        self.assertEqual(r1.status_code, 200)
        self.assertEqual(r1.json()["quota"]["used"], 1)

        # Consume credit 2 with Translate
        pdf2 = create_unique_pdf("Shared test 2 - Translate")
        r2 = self.client.post(
            "/api/v1/ai/translate",
            {"file": pdf2, "target_language": "tamil", "consent": "true"},
            **self.auth_headers
        )
        self.assertEqual(r2.status_code, 200)
        self.assertEqual(r2.json()["quota"]["used"], 2)

        # Consume credit 3 with Chat PDF (new session)
        pdf3 = create_unique_pdf("Shared test 3 - Chat PDF")
        r3 = self.client.post(
            "/api/v1/ai/chat-pdf",
            {"file": pdf3, "query": "Summarize key terms", "consent": "true"},
            **self.auth_headers
        )
        self.assertEqual(r3.status_code, 200)
        self.assertEqual(r3.json()["quota"]["used"], 3)

        # Consume credit 4 with Summarizer (different mode)
        pdf4 = create_unique_pdf("Shared test 4 - Summarizer Detailed")
        r4 = self.client.post(
            "/api/v1/ai/summarize",
            {"file": pdf4, "mode": "detailed", "consent": "true"},
            **self.auth_headers
        )
        self.assertEqual(r4.status_code, 200)
        self.assertEqual(r4.json()["quota"]["used"], 4)

        # Consume credit 5 with Chat PDF (follow-up query in same or new session)
        pdf5 = create_unique_pdf("Shared test 5 - Chat PDF query")
        r5 = self.client.post(
            "/api/v1/ai/chat-pdf",
            {"file": pdf5, "query": "What are the conclusions?", "consent": "true"},
            **self.auth_headers
        )
        self.assertEqual(r5.status_code, 200)
        self.assertEqual(r5.json()["quota"]["used"], 5)
        self.assertEqual(r5.json()["quota"]["remaining"], 0)

        # Quota pool is now completely exhausted (5/5 used).
        # Reset sliding-window rate limit buckets so user rate limit (10/min) doesn't mask quota limit (403)
        AIRateLimitBucket.objects.all().delete()
        reset_rate_limit_memory()
        # Verify that ALL AI tools are immediately blocked with HTTP 403 AI_LIMIT_REACHED:

        # Tool 1: Summarize -> BLOCKED
        r_sum = self.client.post(
            "/api/v1/ai/summarize",
            {"file": create_unique_pdf("Exhausted attempt - Summarizer"), "mode": "quick", "consent": "true"},
            **self.auth_headers
        )
        self.assertEqual(r_sum.status_code, 403)
        self.assertEqual(r_sum.json()["code"], "AI_LIMIT_REACHED")

        # Tool 2: Translate -> BLOCKED
        r_trans = self.client.post(
            "/api/v1/ai/translate",
            {"file": create_unique_pdf("Exhausted attempt - Translate"), "target_language": "tamil", "consent": "true"},
            **self.auth_headers
        )
        self.assertEqual(r_trans.status_code, 403)
        self.assertEqual(r_trans.json()["code"], "AI_LIMIT_REACHED")

        # Tool 3: Chat PDF -> BLOCKED
        r_chat = self.client.post(
            "/api/v1/ai/chat-pdf",
            {"file": create_unique_pdf("Exhausted attempt - Chat PDF"), "query": "Another question?", "consent": "true"},
            **self.auth_headers
        )
        self.assertEqual(r_chat.status_code, 403)
        self.assertEqual(r_chat.json()["code"], "AI_LIMIT_REACHED")

        # Tool 4: Key Points -> BLOCKED
        r_kp = self.client.post(
            "/api/v1/ai/key-points",
            {"file": create_unique_pdf("Exhausted attempt - Key Points"), "consent": True},
            **self.auth_headers
        )
        self.assertEqual(r_kp.status_code, 403)
        self.assertEqual(r_kp.json()["code"], "AI_LIMIT_REACHED")

        # Tool 5: Extract Data -> BLOCKED
        r_ed = self.client.post(
            "/api/v1/ai/extract-data",
            {"file": create_unique_pdf("Exhausted attempt - Extract Data"), "consent": True},
            **self.auth_headers
        )
        self.assertEqual(r_ed.status_code, 403)
        self.assertEqual(r_ed.json()["code"], "AI_LIMIT_REACHED")

        # Tool 6: Generate Questions -> BLOCKED
        r_gq = self.client.post(
            "/api/v1/ai/generate-qns",
            {"file": create_unique_pdf("Exhausted attempt - Generate Qs"), "consent": True},
            **self.auth_headers
        )
        self.assertEqual(r_gq.status_code, 403)
        self.assertEqual(r_gq.json()["code"], "AI_LIMIT_REACHED")

        # Tool 7: Rewrite -> BLOCKED
        r_rw = self.client.post(
            "/api/v1/ai/rewrite",
            {"file": create_unique_pdf("Exhausted attempt - Rewrite"), "consent": True},
            **self.auth_headers
        )
        self.assertEqual(r_rw.status_code, 403)
        self.assertEqual(r_rw.json()["code"], "AI_LIMIT_REACHED")

        # Tool 8: Compare -> BLOCKED
        r_cmp = self.client.post(
            "/api/v1/ai/compare",
            {"file": create_unique_pdf("Exhausted attempt - Compare"), "consent": True},
            **self.auth_headers
        )
        self.assertEqual(r_cmp.status_code, 403)
        self.assertEqual(r_cmp.json()["code"], "AI_LIMIT_REACHED")

    def test_guest_preview_limit_shared_across_all_eight_ai_tools(self):
        """
        Verifies that the 1-request guest preview limit is shared across all eight AI tools:
        Consuming the 1 guest allowance on one tool blocks access to ALL eight tools.
        """
        # 1. New anonymous guest visitor
        guest_client = Client(REMOTE_ADDR=f"10.99.{uuid.uuid4().int % 250 + 1}.{uuid.uuid4().int % 250 + 1}")
        res_guest = guest_client.post("/api/v1/auth/guest")
        self.assertEqual(res_guest.status_code, 200)
        guest_token = res_guest.json()["token"]
        guest_headers = {
            'HTTP_AUTHORIZATION': f"Bearer {guest_token}",
            'HTTP_X_SIMATRIX_AI_CONSENT': "true"
        }

        # 2. Guest uses their single operation on Summarize
        pdf_guest = create_unique_pdf("Guest initial document")
        r_g1 = guest_client.post(
            "/api/v1/ai/summarize",
            {"file": pdf_guest, "mode": "quick", "consent": "true"},
            **guest_headers
        )
        self.assertEqual(r_g1.status_code, 200)
        self.assertEqual(r_g1.json()["quota"]["used"], 1)
        self.assertEqual(r_g1.json()["quota"]["remaining"], 0)

        # 3. Guest tries any of the other AI tools -> ALL BLOCKED with HTTP 403 GUEST_PREVIEW_LIMIT
        AIRateLimitBucket.objects.all().delete()
        reset_rate_limit_memory()

        # Tool 1: Summarize -> BLOCKED
        r_sum = guest_client.post(
            "/api/v1/ai/summarize",
            {"file": create_unique_pdf("Guest over limit - Summarize"), "mode": "quick", "consent": "true"},
            **guest_headers
        )
        self.assertEqual(r_sum.status_code, 403)
        self.assertEqual(r_sum.json()["code"], "GUEST_PREVIEW_LIMIT")

        # Tool 2: Translate -> BLOCKED
        r_trans = guest_client.post(
            "/api/v1/ai/translate",
            {"file": create_unique_pdf("Guest over limit - Translate"), "target_language": "tamil", "consent": "true"},
            **guest_headers
        )
        self.assertEqual(r_trans.status_code, 403)
        self.assertEqual(r_trans.json()["code"], "GUEST_PREVIEW_LIMIT")

        # Tool 3: Chat PDF -> BLOCKED
        r_chat = guest_client.post(
            "/api/v1/ai/chat-pdf",
            {"file": create_unique_pdf("Guest over limit - Chat PDF"), "query": "Ask question", "consent": "true"},
            **guest_headers
        )
        self.assertEqual(r_chat.status_code, 403)
        self.assertEqual(r_chat.json()["code"], "GUEST_PREVIEW_LIMIT")

        # Tool 4: Key Points -> BLOCKED
        r_kp = guest_client.post(
            "/api/v1/ai/key-points",
            {"file": create_unique_pdf("Guest over limit - Key Points"), "consent": True},
            **guest_headers
        )
        self.assertEqual(r_kp.status_code, 403)
        self.assertEqual(r_kp.json()["code"], "GUEST_PREVIEW_LIMIT")

        # Tool 5: Extract Data -> BLOCKED
        r_ed = guest_client.post(
            "/api/v1/ai/extract-data",
            {"file": create_unique_pdf("Guest over limit - Extract Data"), "consent": True},
            **guest_headers
        )
        self.assertEqual(r_ed.status_code, 403)
        self.assertEqual(r_ed.json()["code"], "GUEST_PREVIEW_LIMIT")

        # Tool 6: Generate Questions -> BLOCKED
        r_gq = guest_client.post(
            "/api/v1/ai/generate-qns",
            {"file": create_unique_pdf("Guest over limit - Generate Qs"), "consent": True},
            **guest_headers
        )
        self.assertEqual(r_gq.status_code, 403)
        self.assertEqual(r_gq.json()["code"], "GUEST_PREVIEW_LIMIT")

        # Tool 7: Rewrite -> BLOCKED
        r_rw = guest_client.post(
            "/api/v1/ai/rewrite",
            {"file": create_unique_pdf("Guest over limit - Rewrite"), "consent": True},
            **guest_headers
        )
        self.assertEqual(r_rw.status_code, 403)
        self.assertEqual(r_rw.json()["code"], "GUEST_PREVIEW_LIMIT")

        # Tool 8: Compare -> BLOCKED
        r_cmp = guest_client.post(
            "/api/v1/ai/compare",
            {"file": create_unique_pdf("Guest over limit - Compare"), "consent": True},
            **guest_headers
        )
        self.assertEqual(r_cmp.status_code, 403)
        self.assertEqual(r_cmp.json()["code"], "GUEST_PREVIEW_LIMIT")

    def test_direct_endpoint_calls_cannot_bypass_either_quota(self):
        """
        Verifies that direct API requests cannot bypass quota controls:
        - Forged tokens are rejected (HTTP 401).
        - Calls missing explicit user consent are rejected (HTTP 400).
        - Subsequent unauthenticated requests are blocked at guest limit (HTTP 403).
        """
        pdf = create_unique_pdf("Direct unauthenticated document")

        # Direct request with forged / tampered token
        resp_forged = self.client.post(
            "/api/v1/ai/summarize",
            {"file": pdf, "mode": "quick", "consent": "true"},
            HTTP_AUTHORIZATION="Bearer eyJhbGciOiJIUzI1NiJ9.forged_signature_123"
        )
        self.assertEqual(resp_forged.status_code, 401)

        # Direct request where user explicitly revoked or refused consent
        pdf2 = create_unique_pdf("Document without consent")
        resp_no_consent = self.client.post(
            "/api/v1/ai/summarize",
            {"file": pdf2, "mode": "quick", "consent": "false"},
            **self.auth_headers
        )
        self.assertEqual(resp_no_consent.status_code, 400)
        self.assertEqual(resp_no_consent.json()["code"], "AI_CONSENT_REQUIRED")

        # Direct unauthenticated request without token or cookie: immediately rejected with HTTP 401
        unauth_client = Client(REMOTE_ADDR=f"10.77.{uuid.uuid4().int % 250 + 1}.{uuid.uuid4().int % 250 + 1}")
        pdf3 = create_unique_pdf("Direct raw unauth request")
        r_unauth = unauth_client.post(
            "/api/v1/ai/summarize",
            {"file": pdf3, "mode": "quick", "consent": "true"}
        )
        self.assertEqual(r_unauth.status_code, 401)

        # Direct unauthenticated request to Translate: also rejected with HTTP 401
        r_unauth_tr = unauth_client.post(
            "/api/v1/ai/translate",
            {"file": create_unique_pdf("Direct unauth translate"), "target_language": "tamil", "consent": "true"}
        )
        self.assertEqual(r_unauth_tr.status_code, 401)

        # Direct unauthenticated request to Chat PDF: also rejected with HTTP 401
        r_unauth_ch = unauth_client.post(
            "/api/v1/ai/chat-pdf",
            {"file": create_unique_pdf("Direct unauth chat"), "query": "Test query", "consent": "true"}
        )
        self.assertEqual(r_unauth_ch.status_code, 401)
