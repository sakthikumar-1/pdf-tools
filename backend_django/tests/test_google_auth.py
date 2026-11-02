"""
Simatrix PDF - End-to-End Google OAuth & Session Authentication Integration Tests.
Validates:
1. Google OAuth ID token verification via tokeninfo endpoint.
2. Offline / resilient JWT payload decode fallback when Google tokeninfo times out.
3. User profile creation (is_verified=True, role='user').
4. Automatic 5-request AI quota provisioning.
5. Persistent guest device linking to the authenticated Google account.
6. Session token verification on protected endpoints (/auth/me and /ai/quota).
7. Preservation of existing user quota across multiple logins.
"""

import base64
import json
import time
import uuid
from unittest.mock import patch, MagicMock

import requests
from django.test import TestCase, Client
from django.core.cache import cache

from apps.authentication.models import User, GuestDeviceIdentity, AIUserQuota, AIRateLimitBucket
from apps.authentication.guest_service import GUEST_DEVICE_COOKIE_NAME, get_or_create_guest_identity
from ai.rate_limiter import reset_rate_limit_memory


def create_mock_jwt(payload_dict: dict) -> str:
    """Creates an unsigned mock JWT (header.payload.signature) for testing decode fallbacks."""
    header = base64.urlsafe_b64encode(json.dumps({"alg": "RS256", "typ": "JWT"}).encode("utf-8")).decode("utf-8").rstrip("=")
    body = base64.urlsafe_b64encode(json.dumps(payload_dict).encode("utf-8")).decode("utf-8").rstrip("=")
    signature = base64.urlsafe_b64encode(b"simulated_signature_bytes").decode("utf-8").rstrip("=")
    return f"{header}.{body}.{signature}"


class GoogleAuthEndToEndTests(TestCase):
    """End-to-end test suite for Google authentication, token verification, and quota setup."""

    def setUp(self):
        super().setUp()
        cache.clear()
        AIRateLimitBucket.objects.all().delete()
        reset_rate_limit_memory()
        self.client = Client()

    def test_01_google_auth_with_verified_credential(self):
        """1. Full Google OAuth flow: tokeninfo verification, profile creation, and 5-credit quota."""
        mock_id_token = "google_id_token_test_123"
        google_payload = {
            "iss": "https://accounts.google.com",
            "sub": "google-sub-1001",
            "email": "jane.doe@example.com",
            "email_verified": "true",
            "name": "Jane Doe",
            "picture": "https://lh3.googleusercontent.com/a/mock-photo",
            "aud": "mock-client-id.apps.googleusercontent.com"
        }

        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = google_payload

        with patch("requests.get", return_value=mock_resp) as mock_get:
            res = self.client.post(
                "/api/v1/auth/google",
                json.dumps({"credential": mock_id_token}),
                content_type="application/json"
            )

            # Verify tokeninfo endpoint was called with correct parameters
            mock_get.assert_called_once_with(
                "https://oauth2.googleapis.com/tokeninfo",
                params={"id_token": mock_id_token},
                timeout=5
            )

        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertIn("token", data)
        self.assertEqual(data["user"]["email"], "jane.doe@example.com")
        self.assertEqual(data["user"]["full_name"], "Jane Doe")
        self.assertEqual(data["user"]["avatar_url"], "https://lh3.googleusercontent.com/a/mock-photo")
        self.assertEqual(data["user"]["role"], "user")
        self.assertTrue(data["user"]["is_verified"])

        # Quota verification in auth response
        self.assertIsNotNone(data["quota"])
        self.assertEqual(data["quota"]["limit"], 5)
        self.assertEqual(data["quota"]["used"], 0)
        self.assertEqual(data["quota"]["remaining"], 5)

        # Database verification
        user = User.objects.get(email="jane.doe@example.com")
        self.assertEqual(user.full_name, "Jane Doe")
        self.assertTrue(user.is_verified)
        self.assertFalse(user.has_usable_password())

        quota = AIUserQuota.objects.get(user=user)
        self.assertEqual(quota.total_allowed, 5)
        self.assertEqual(quota.used_count, 0)
        self.assertFalse(quota.is_blocked)

    def test_02_session_token_authenticates_protected_endpoints(self):
        """2. Cryptographic session token allows access to /auth/me and /ai/quota."""
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "email": "session.tester@example.com",
            "name": "Session Tester",
            "picture": "https://avatar.example.com/st",
        }

        with patch("requests.get", return_value=mock_resp):
            res_login = self.client.post(
                "/api/v1/auth/google",
                json.dumps({"credential": "valid_token_xyz"}),
                content_type="application/json"
            )
        token = res_login.json()["token"]

        # Verify /auth/me with Bearer token
        res_me = self.client.get(
            "/api/v1/auth/me",
            HTTP_AUTHORIZATION=f"Bearer {token}"
        )
        self.assertEqual(res_me.status_code, 200)
        me_data = res_me.json()
        self.assertTrue(me_data.get("authenticated", False))
        self.assertEqual(me_data["user"]["email"], "session.tester@example.com")
        self.assertEqual(me_data["user"]["full_name"], "Session Tester")

        # Verify /ai/quota with Bearer token
        res_quota = self.client.get(
            "/api/v1/ai/quota",
            HTTP_AUTHORIZATION=f"Bearer {token}"
        )
        self.assertEqual(res_quota.status_code, 200)
        quota_data = res_quota.json()
        self.assertEqual(quota_data["total_allowed"], 5)
        self.assertEqual(quota_data["used_count"], 0)
        self.assertEqual(quota_data["remaining"], 5)

    def test_03_google_auth_jwt_payload_decode_fallback_on_tokeninfo_timeout(self):
        """3. When Google's tokeninfo API times out, server safely decodes claims from JWT payload."""
        fallback_jwt = create_mock_jwt({
            "iss": "https://accounts.google.com",
            "sub": "sub-offline-999",
            "email": "offline.user@example.com",
            "name": "Offline User",
            "picture": "https://offline.avatar.com/pic.png",
            "email_verified": True
        })

        # Simulate network timeout contacting tokeninfo
        with patch("requests.get", side_effect=requests.Timeout("Google tokeninfo timeout after 5s")):
            res = self.client.post(
                "/api/v1/auth/google",
                json.dumps({"credential": fallback_jwt}),
                content_type="application/json"
            )

        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["user"]["email"], "offline.user@example.com")
        self.assertEqual(data["user"]["full_name"], "Offline User")
        self.assertTrue(data["user"]["is_verified"])
        self.assertEqual(data["quota"]["remaining"], 5)

        # Database verification
        user = User.objects.get(email="offline.user@example.com")
        self.assertTrue(user.is_verified)
        self.assertEqual(user.full_name, "Offline User")

    def test_04_guest_device_linking_on_google_signin(self):
        """4. Active browser guest device profile is safely linked to user account upon Google login."""
        # 1. Visitor initializes as guest
        res_guest = self.client.post("/api/v1/auth/guest")
        self.assertEqual(res_guest.status_code, 200)
        guest_id = res_guest.json()["user"]["guest_id"]

        guest_profile = GuestDeviceIdentity.objects.get(guest_id=guest_id)
        self.assertIsNone(guest_profile.linked_user_id)

        # 2. Same browser visitor signs in with Google
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "email": "upgraded.visitor@example.com",
            "name": "Upgraded Visitor",
        }

        with patch("requests.get", return_value=mock_resp):
            res_google = self.client.post(
                "/api/v1/auth/google",
                json.dumps({"credential": "token_for_link"}),
                content_type="application/json"
            )
        self.assertEqual(res_google.status_code, 200)

        # 3. Verify guest device record is linked to the new registered user
        user = User.objects.get(email="upgraded.visitor@example.com")
        guest_profile.refresh_from_db()
        self.assertEqual(str(guest_profile.linked_user_id), str(user.id))

    def test_05_subsequent_google_login_preserves_existing_quota_and_updates_profile(self):
        """5. Re-authenticating with Google preserves existing consumed quota and doesn't duplicate user."""
        mock_resp1 = MagicMock()
        mock_resp1.status_code = 200
        mock_resp1.json.return_value = {
            "email": "repeat.user@example.com",
            "name": "Initial Name",
            "picture": None
        }

        with patch("requests.get", return_value=mock_resp1):
            res1 = self.client.post(
                "/api/v1/auth/google",
                json.dumps({"credential": "tok1"}),
                content_type="application/json"
            )
        self.assertEqual(res1.status_code, 200)
        user_id = res1.json()["user"]["id"]

        # Simulate user consuming 2 AI credits
        user = User.objects.get(id=user_id)
        quota = AIUserQuota.objects.get(user=user)
        quota.used_count = 2
        quota.save(update_fields=["used_count"])

        # Second login with updated name and avatar from Google
        mock_resp2 = MagicMock()
        mock_resp2.status_code = 200
        mock_resp2.json.return_value = {
            "email": "repeat.user@example.com",
            "name": "Updated Name",
            "picture": "https://photo.example.com/new.png"
        }

        with patch("requests.get", return_value=mock_resp2):
            res2 = self.client.post(
                "/api/v1/auth/google",
                json.dumps({"credential": "tok2"}),
                content_type="application/json"
            )
        self.assertEqual(res2.status_code, 200)
        data2 = res2.json()

        # Same user ID, no duplicates
        self.assertEqual(data2["user"]["id"], user_id)
        self.assertEqual(User.objects.filter(email="repeat.user@example.com").count(), 1)

        # Profile updated
        self.assertEqual(data2["user"]["avatar_url"], "https://photo.example.com/new.png")

        # Quota preserved: 2 used, 3 remaining
        self.assertEqual(data2["quota"]["used"], 2)
        self.assertEqual(data2["quota"]["limit"], 5)
        self.assertEqual(data2["quota"]["remaining"], 3)
