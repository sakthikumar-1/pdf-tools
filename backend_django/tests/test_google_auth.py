"""
Simatrix PDF - Comprehensive Google ID-Token Authentication & Quota Regression Tests.
Validates:
1. Valid ID token verification via google.oauth2.id_token.verify_oauth2_token.
2. Invalid cryptographic signature rejection (fail closed with HTTP 401).
3. Expired ID token rejection (fail closed with HTTP 401).
4. Wrong audience rejection (fail closed with HTTP 401).
5. Untrusted issuer rejection (fail closed with HTTP 401).
6. Unverified email rejection (fail closed with HTTP 401).
7. Verification network timeout / TransportError (fail closed with HTTP 502).
8. Existing user login & quota preservation (consumed credits retained, no duplicate accounts).
9. New user registration & 5-request AI quota provisioning.
10. Rejection of OAuth access tokens (HTTP 400 - genuine ID token strictly required).
11. Immunity to untrusted client-supplied claims (browser payload ignored, verified claims take precedence).
12. Missing stable Google sub identifier rejection (fail closed with HTTP 401).
13. Session token authenticated protected endpoints (/auth/me and /ai/quota).
14. Frontend Login.jsx and LoginModal.jsx integration verification (google.accounts.id.initialize).
"""

import json
import time
from pathlib import Path
from unittest.mock import patch, MagicMock

from django.test import TestCase, Client
from django.core.cache import cache
from google.auth.exceptions import TransportError

from apps.authentication.models import User, AIUserQuota, AIRateLimitBucket
from ai.rate_limiter import reset_rate_limit_memory


class GoogleAuthRegressionTests(TestCase):
    """Exhaustive test suite for Google authentication, token verification, and quota preservation."""

    def setUp(self):
        super().setUp()
        cache.clear()
        AIRateLimitBucket.objects.all().delete()
        reset_rate_limit_memory()
        self.client = Client()

    def test_01_valid_google_id_token_authenticates_and_provisions_quota(self):
        """1. Valid Google ID token verifies signature, provisions new user with 5 credits, and creates session."""
        mock_claims = {
            "iss": "https://accounts.google.com",
            "sub": "google-sub-2001",
            "email": "alice.wonderland@example.com",
            "email_verified": True,
            "name": "Alice Wonderland",
            "picture": "https://lh3.googleusercontent.com/alice",
            "aud": "mock-client-id.apps.googleusercontent.com",
            "exp": int(time.time()) + 3600
        }

        with patch("google.oauth2.id_token.verify_oauth2_token", return_value=mock_claims):
            res = self.client.post(
                "/api/v1/auth/google",
                json.dumps({"credential": "genuine.google.idtoken.xyz"}),
                content_type="application/json"
            )

        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertIn("token", data)
        self.assertEqual(data["user"]["email"], "alice.wonderland@example.com")
        self.assertEqual(data["user"]["full_name"], "Alice Wonderland")
        self.assertEqual(data["user"]["avatar_url"], "https://lh3.googleusercontent.com/alice")
        self.assertTrue(data["user"]["is_verified"])

        # Quota verification
        self.assertEqual(data["quota"]["limit"], 5)
        self.assertEqual(data["quota"]["used"], 0)
        self.assertEqual(data["quota"]["remaining"], 5)

        # Database assertions
        user = User.objects.get(email="alice.wonderland@example.com")
        self.assertTrue(user.is_verified)
        self.assertFalse(user.has_usable_password())
        quota = AIUserQuota.objects.get(user=user)
        self.assertEqual(quota.total_allowed, 5)
        self.assertEqual(quota.used_count, 0)

    def test_02_invalid_signature_fails_closed(self):
        """2. Forged or invalid token signature raises ValueError and fails closed with HTTP 401."""
        with patch("google.oauth2.id_token.verify_oauth2_token", side_effect=ValueError("Invalid token signature")):
            res = self.client.post(
                "/api/v1/auth/google",
                json.dumps({"credential": "forged.signature.token"}),
                content_type="application/json"
            )

        self.assertEqual(res.status_code, 401)
        self.assertIn("Invalid, forged, or expired Google OAuth credential", res.json().get("detail", ""))
        self.assertFalse(User.objects.filter(email="attacker@example.com").exists())

    def test_03_expired_token_fails_closed(self):
        """3. Expired ID token raises ValueError or fails expiration check with HTTP 401."""
        with patch("google.oauth2.id_token.verify_oauth2_token", side_effect=ValueError("Token expired")):
            res = self.client.post(
                "/api/v1/auth/google",
                json.dumps({"credential": "expired.id.token"}),
                content_type="application/json"
            )

        self.assertEqual(res.status_code, 401)
        self.assertIn("Invalid, forged, or expired Google OAuth credential", res.json().get("detail", ""))

    def test_04_wrong_audience_fails_closed(self):
        """4. ID token minted for a different application client ID fails closed with HTTP 401."""
        with patch("google.oauth2.id_token.verify_oauth2_token", side_effect=ValueError("Token wrong audience")):
            res = self.client.post(
                "/api/v1/auth/google",
                json.dumps({"credential": "wrong.audience.token"}),
                content_type="application/json"
            )

        self.assertEqual(res.status_code, 401)
        self.assertIn("Invalid, forged, or expired Google OAuth credential", res.json().get("detail", ""))

    def test_05_untrusted_issuer_fails_closed(self):
        """5. Token with an untrusted issuer (not accounts.google.com) fails closed with HTTP 401."""
        mock_claims = {
            "iss": "https://attacker-identity-provider.com",
            "sub": "sub-evil-99",
            "email": "victim@example.com",
            "email_verified": True,
            "aud": "mock-client-id.apps.googleusercontent.com",
            "exp": int(time.time()) + 3600
        }

        with patch("google.oauth2.id_token.verify_oauth2_token", return_value=mock_claims):
            res = self.client.post(
                "/api/v1/auth/google",
                json.dumps({"credential": "untrusted.issuer.token"}),
                content_type="application/json"
            )

        self.assertEqual(res.status_code, 401)
        self.assertIn("Untrusted token issuer", res.json().get("detail", ""))
        self.assertFalse(User.objects.filter(email="victim@example.com").exists())

    def test_06_unverified_email_fails_closed(self):
        """6. ID token where email_verified is False is rejected with HTTP 401."""
        mock_claims = {
            "iss": "https://accounts.google.com",
            "sub": "sub-unverified-77",
            "email": "unverified@example.com",
            "email_verified": False,
            "aud": "mock-client-id.apps.googleusercontent.com",
            "exp": int(time.time()) + 3600
        }

        with patch("google.oauth2.id_token.verify_oauth2_token", return_value=mock_claims):
            res = self.client.post(
                "/api/v1/auth/google",
                json.dumps({"credential": "unverified.email.token"}),
                content_type="application/json"
            )

        self.assertEqual(res.status_code, 401)
        self.assertIn("Google account email address is not verified", res.json().get("detail", ""))
        self.assertFalse(User.objects.filter(email="unverified@example.com").exists())

    def test_07_network_timeout_during_verification_fails_closed(self):
        """7. Upstream timeout or connection error contacting Google's certs fails closed with HTTP 502."""
        with patch("google.oauth2.id_token.verify_oauth2_token", side_effect=TransportError("Google certs timeout")):
            res = self.client.post(
                "/api/v1/auth/google",
                json.dumps({"credential": "timeout.token"}),
                content_type="application/json"
            )

        self.assertEqual(res.status_code, 502)
        self.assertIn("Google authentication verification service is unreachable", res.json().get("detail", ""))
        self.assertFalse(User.objects.filter(email="timeout@example.com").exists())

    def test_08_existing_user_preserves_quota_history_across_logins(self):
        """8. Re-authentication of an existing user preserves consumed quota and does not reset usage."""
        user = User.objects.create(
            email="returning.user@example.com",
            username="returning_user",
            full_name="Returning User",
            is_verified=True,
            role="user"
        )
        quota = user.ai_quota
        quota.used_count = 3
        quota.save(update_fields=["used_count"])

        mock_claims = {
            "iss": "https://accounts.google.com",
            "sub": "google-sub-returning",
            "email": "returning.user@example.com",
            "email_verified": True,
            "name": "Returning User Updated",
            "picture": "https://lh3.googleusercontent.com/new_pic",
            "aud": "mock-client-id.apps.googleusercontent.com",
            "exp": int(time.time()) + 3600
        }

        with patch("google.oauth2.id_token.verify_oauth2_token", return_value=mock_claims):
            res = self.client.post(
                "/api/v1/auth/google",
                json.dumps({"credential": "valid.returning.token"}),
                content_type="application/json"
            )

        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["user"]["id"], str(user.id))
        self.assertEqual(data["user"]["full_name"], "Returning User Updated")
        self.assertEqual(data["user"]["avatar_url"], "https://lh3.googleusercontent.com/new_pic")

        # Quota remains preserved: exactly 3 used, 2 remaining
        self.assertEqual(data["quota"]["limit"], 5)
        self.assertEqual(data["quota"]["used"], 3)
        self.assertEqual(data["quota"]["remaining"], 2)

        # Ensure no duplicate accounts were created
        self.assertEqual(User.objects.filter(email="returning.user@example.com").count(), 1)

    def test_09_oauth_access_tokens_are_strictly_rejected(self):
        """9. Submitting an OAuth access token (ya29... or token_type=access_token) returns HTTP 400."""
        res1 = self.client.post(
            "/api/v1/auth/google",
            json.dumps({"credential": "ya29.a0AfH6SMB_fake_access_token_12345"}),
            content_type="application/json"
        )
        self.assertEqual(res1.status_code, 400)
        self.assertIn("OAuth access tokens are not accepted", res1.json().get("detail", ""))

        res2 = self.client.post(
            "/api/v1/auth/google",
            json.dumps({"credential": "token_abc", "token_type": "access_token"}),
            content_type="application/json"
        )
        self.assertEqual(res2.status_code, 400)
        self.assertIn("OAuth access tokens are not accepted", res2.json().get("detail", ""))

    def test_10_untrusted_client_payload_is_completely_ignored(self):
        """10. Untrusted email, name, or avatar submitted by the browser are ignored in favor of verified claims."""
        mock_claims = {
            "iss": "https://accounts.google.com",
            "sub": "google-sub-genuine",
            "email": "genuine.account@example.com",
            "email_verified": True,
            "name": "Genuine Name",
            "picture": "https://lh3.googleusercontent.com/genuine",
            "aud": "mock-client-id.apps.googleusercontent.com",
            "exp": int(time.time()) + 3600
        }

        with patch("google.oauth2.id_token.verify_oauth2_token", return_value=mock_claims):
            res = self.client.post(
                "/api/v1/auth/google",
                json.dumps({
                    "credential": "valid.token.for.genuine",
                    # Untrusted values from client attempt to spoof identity
                    "email": "spoofed.victim@example.com",
                    "name": "Spoofed Attacker",
                    "avatar_url": "https://attacker.com/malicious.png"
                }),
                content_type="application/json"
            )

        self.assertEqual(res.status_code, 200)
        data = res.json()
        # Identity strictly reflects verified claims
        self.assertEqual(data["user"]["email"], "genuine.account@example.com")
        self.assertEqual(data["user"]["full_name"], "Genuine Name")
        self.assertEqual(data["user"]["avatar_url"], "https://lh3.googleusercontent.com/genuine")
        self.assertFalse(User.objects.filter(email="spoofed.victim@example.com").exists())

    def test_11_missing_sub_claim_fails_closed(self):
        """11. An ID token payload missing the stable Google 'sub' claim fails closed with HTTP 401."""
        mock_claims = {
            "iss": "https://accounts.google.com",
            "sub": "",  # Missing sub!
            "email": "no.sub@example.com",
            "email_verified": True,
            "aud": "mock-client-id.apps.googleusercontent.com",
            "exp": int(time.time()) + 3600
        }

        with patch("google.oauth2.id_token.verify_oauth2_token", return_value=mock_claims):
            res = self.client.post(
                "/api/v1/auth/google",
                json.dumps({"credential": "no.sub.token"}),
                content_type="application/json"
            )

        self.assertEqual(res.status_code, 401)
        self.assertIn("Missing stable Google user identifier (sub)", res.json().get("detail", ""))

    def test_12_session_token_authenticates_protected_endpoints(self):
        """12. Session token created from Google authentication successfully accesses /auth/me and /ai/quota."""
        mock_claims = {
            "iss": "https://accounts.google.com",
            "sub": "google-sub-protected",
            "email": "protected.endpoints@example.com",
            "email_verified": True,
            "name": "Protected Tester",
            "aud": "mock-client-id.apps.googleusercontent.com",
            "exp": int(time.time()) + 3600
        }

        with patch("google.oauth2.id_token.verify_oauth2_token", return_value=mock_claims):
            res = self.client.post(
                "/api/v1/auth/google",
                json.dumps({"credential": "valid.protected.token"}),
                content_type="application/json"
            )
        token = res.json()["token"]

        # 1. /auth/me
        res_me = self.client.get("/api/v1/auth/me", HTTP_AUTHORIZATION=f"Bearer {token}")
        self.assertEqual(res_me.status_code, 200)
        self.assertEqual(res_me.json()["user"]["email"], "protected.endpoints@example.com")

        # 2. /ai/quota
        res_quota = self.client.get("/api/v1/ai/quota", HTTP_AUTHORIZATION=f"Bearer {token}")
        self.assertEqual(res_quota.status_code, 200)
        self.assertEqual(res_quota.json()["remaining"], 5)

    def test_13_frontend_components_use_google_accounts_id_initialize(self):
        """13. Inspects Login.jsx and LoginModal.jsx to verify ID-token authentication with google.accounts.id.initialize."""
        login_jsx = Path("frontend/src/pages/Login.jsx").read_text(encoding="utf-8")
        login_modal_jsx = Path("frontend/src/components/LoginModal.jsx").read_text(encoding="utf-8")

        # Must use google.accounts.id.initialize
        self.assertIn("google.accounts.id.initialize", login_jsx)
        self.assertIn("google.accounts.id.initialize", login_modal_jsx)

        # Must NOT use initTokenClient (which returns OAuth access tokens)
        self.assertNotIn("initTokenClient", login_jsx)
        self.assertNotIn("initTokenClient", login_modal_jsx)

        # Must send token_type: 'id_token'
        self.assertIn("token_type: 'id_token'", login_jsx)
        self.assertIn("token_type: 'id_token'", login_modal_jsx)
