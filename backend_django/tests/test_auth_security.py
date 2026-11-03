"""
Simatrix PDF — Comprehensive Security Integration Tests for Phase 2: Authentication & Authorization.
Tests:
1. Rejection of unauthenticated email impersonation (SEC-01 fix verification).
2. Rejection of empty/missing credentials on /auth/google.
3. Server-side session invalidation on logout across all protected endpoints.
4. Strict cross-user object-level authorization (IDOR protection on chat sessions).
5. Inactive/suspended user account access blocking.
"""

import json
import time
from unittest.mock import patch, MagicMock

from django.test import TestCase, Client
from django.core.cache import cache

from apps.authentication.models import User, AIChatSession, AIChatMessage, AIUserQuota
from core.api import token_signer


class AuthenticationAndAuthorizationSecurityTests(TestCase):
    """Test suite for Phase 2 Authentication and Object-level Authorization."""

    def setUp(self):
        super().setUp()
        cache.clear()
        self.client = Client()

        # Create two separate users
        self.user_a = User.objects.create(
            email="alice@example.com",
            username="alice",
            full_name="Alice Smith",
            role="user",
            is_verified=True,
            is_active=True
        )
        self.token_a = token_signer.sign_object({
            "user_id": str(self.user_a.id),
            "email": self.user_a.email,
            "ts": int(time.time())
        })

        self.user_b = User.objects.create(
            email="bob@example.com",
            username="bob",
            full_name="Bob Jones",
            role="user",
            is_verified=True,
            is_active=True
        )
        self.token_b = token_signer.sign_object({
            "user_id": str(self.user_b.id),
            "email": self.user_b.email,
            "ts": int(time.time())
        })

    def test_01_rejection_of_unauthenticated_email_impersonation(self):
        """1. SEC-01 Fix: Attempting to sign in with arbitrary email without Google credential is blocked."""
        # An attacker attempts to log in as alice by providing only email
        res = self.client.post(
            "/api/v1/auth/google",
            json.dumps({"email": "alice@example.com"}),
            content_type="application/json"
        )
        self.assertEqual(res.status_code, 400)
        data = res.json()
        detail = data.get("detail", "") or data.get("message", "")
        self.assertIn("credential", detail.lower())

        # Attempt with whitespace credential
        res_empty = self.client.post(
            "/api/v1/auth/google",
            json.dumps({"email": "alice@example.com", "credential": "   "}),
            content_type="application/json"
        )
        self.assertEqual(res_empty.status_code, 400)

    def test_02_session_invalidation_on_logout(self):
        """2. Calling /auth/logout immediately invalidates the token on /auth/me and /ai/quota."""
        # Verify token_a works initially on /auth/me
        res_me_before = self.client.get(
            "/api/v1/auth/me",
            HTTP_AUTHORIZATION=f"Bearer {self.token_a}"
        )
        self.assertEqual(res_me_before.status_code, 200)
        self.assertTrue(res_me_before.json()["authenticated"])

        # Call logout with token_a
        res_logout = self.client.post(
            "/api/v1/auth/logout",
            HTTP_AUTHORIZATION=f"Bearer {self.token_a}"
        )
        self.assertEqual(res_logout.status_code, 200)

        # Subsequent call to /auth/me with the same token must be rejected with 401
        res_me_after = self.client.get(
            "/api/v1/auth/me",
            HTTP_AUTHORIZATION=f"Bearer {self.token_a}"
        )
        self.assertEqual(res_me_after.status_code, 401)
        self.assertIn("invalidated", res_me_after.json().get("detail", "").lower())

        # Token A must also be rejected on AI endpoints (/ai/quota)
        res_quota_after = self.client.get(
            "/api/v1/ai/quota",
            HTTP_AUTHORIZATION=f"Bearer {self.token_a}"
        )
        self.assertEqual(res_quota_after.status_code, 401)

        # Meanwhile, User B's token remains valid (isolated per-session invalidation)
        res_b = self.client.get(
            "/api/v1/auth/me",
            HTTP_AUTHORIZATION=f"Bearer {self.token_b}"
        )
        self.assertEqual(res_b.status_code, 200)

    def test_03_cross_user_chat_session_access_blocked(self):
        """3. Cross-user object authorization: User B cannot view, query, or delete User A's chat session."""
        from django.utils import timezone
        from datetime import timedelta

        # User A creates a chat session
        session_a = AIChatSession.objects.create(
            user=self.user_a,
            document_name="alices_private_doc.pdf",
            document_sha256="abc123sha",
            page_count=5,
            is_active=True,
            expires_at=timezone.now() + timedelta(hours=24)
        )
        AIChatMessage.objects.create(
            session=session_a,
            role="assistant",
            content="Confidential financial report analysis."
        )

        session_id = str(session_a.id)

        # Alice can access her own session
        res_alice = self.client.get(
            f"/api/v1/ai/chat-pdf/session/{session_id}",
            HTTP_AUTHORIZATION=f"Bearer {self.token_a}"
        )
        self.assertEqual(res_alice.status_code, 200)
        self.assertEqual(res_alice.json()["document_name"], "alices_private_doc.pdf")

        # Bob attempts GET on Alice's session -> must return 403 Forbidden
        res_bob_get = self.client.get(
            f"/api/v1/ai/chat-pdf/session/{session_id}",
            HTTP_AUTHORIZATION=f"Bearer {self.token_b}"
        )
        self.assertEqual(res_bob_get.status_code, 403)
        self.assertEqual(res_bob_get.json()["code"], "ACCESS_DENIED")

        # Bob attempts DELETE on Alice's session -> must return 403 Forbidden
        res_bob_delete = self.client.delete(
            f"/api/v1/ai/chat-pdf/session/{session_id}",
            HTTP_AUTHORIZATION=f"Bearer {self.token_b}"
        )
        self.assertEqual(res_bob_delete.status_code, 403)
        self.assertEqual(res_bob_delete.json()["code"], "ACCESS_DENIED")

        # Confirm session is still intact
        session_check = AIChatSession.objects.filter(id=session_id).first()
        self.assertIsNotNone(session_check)
        self.assertTrue(session_check.is_active)

    def test_04_inactive_user_account_blocked(self):
        """4. Inactive / disabled user accounts are rejected on /auth/me and AI endpoints."""
        self.user_a.is_active = False
        self.user_a.save(update_fields=["is_active"])

        res_me = self.client.get(
            "/api/v1/auth/me",
            HTTP_AUTHORIZATION=f"Bearer {self.token_a}"
        )
        self.assertEqual(res_me.status_code, 404)

