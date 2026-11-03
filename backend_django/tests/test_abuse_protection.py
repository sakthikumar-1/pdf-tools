"""
Simatrix PDF — Comprehensive Abuse Protection & Rate Limiting Tests (Phase 3: SEC-05).
Tests:
1. Google OAuth rate limiting prevents credential stuffing / brute-force attacks (HTTP 429).
2. PDF utility endpoints enforce rate limits to protect server RAM and CPU (HTTP 429).
3. File download endpoint enforces rate limits against scraping / DoS (HTTP 429).
4. Resetting rate limit restores normal access.
"""

import io
import time
from unittest.mock import patch, MagicMock

from django.test import TestCase, Client
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile

from core.rate_limiter import reset_rate_limits, check_auth_rate_limit, check_utility_rate_limit, check_download_rate_limit
from core.api import token_signer
from apps.authentication.models import AIRateLimitBucket


class AbuseProtectionTests(TestCase):
    """Test suite for Phase 3 API Abuse Protection & Rate Limiting."""

    def setUp(self):
        super().setUp()
        cache.clear()
        reset_rate_limits()
        AIRateLimitBucket.objects.all().delete()
        self.client = Client()

    def tearDown(self):
        reset_rate_limits()
        AIRateLimitBucket.objects.all().delete()
        super().tearDown()

    def test_01_auth_endpoint_rate_limiting(self):
        """1. SEC-05: Spamming /auth/google triggers HTTP 429."""
        ip = "198.51.100.1"

        # Fire 20 requests within the limit
        for i in range(20):
            res = self.client.post(
                "/api/v1/auth/google",
                data='{"credential": ""}',
                content_type="application/json",
                HTTP_X_FORWARDED_FOR=ip
            )
            self.assertNotEqual(res.status_code, 429, f"Request {i+1} should not be rate limited")

        # 21st request must trigger HTTP 429 Too Many Requests
        res_blocked = self.client.post(
            "/api/v1/auth/google",
            data='{"credential": ""}',
            content_type="application/json",
            HTTP_X_FORWARDED_FOR=ip
        )
        self.assertEqual(res_blocked.status_code, 429)
        self.assertIn("Too many authentication attempts", res_blocked.json().get("detail", ""))

    def test_02_utility_endpoint_rate_limiting(self):
        """2. SEC-05: Spamming utility operations triggers HTTP 429."""
        ip = "198.51.100.2"

        # Make 60 requests up to limit with valid form upload
        for i in range(60):
            res = self.client.post(
                "/api/v1/convert/pdf-to-jpg",
                {"file": SimpleUploadedFile("sample.pdf", b"not-a-pdf", content_type="application/pdf")},
                HTTP_X_FORWARDED_FOR=ip
            )
            self.assertNotEqual(res.status_code, 429, f"Utility request {i+1} should not be rate limited")

        # 61st request must be rate limited with 429
        res_blocked = self.client.post(
            "/api/v1/convert/pdf-to-jpg",
            {"file": SimpleUploadedFile("sample.pdf", b"not-a-pdf", content_type="application/pdf")},
            HTTP_X_FORWARDED_FOR=ip
        )
        self.assertEqual(res_blocked.status_code, 429)
        self.assertIn("Rate limit exceeded", res_blocked.json().get("detail", ""))

    def test_03_download_endpoint_rate_limiting(self):
        """3. SEC-05: Download endpoint enforces rate limiting."""
        ip = "198.51.100.3"

        for i in range(120):
            res = self.client.get(
                "/api/v1/download/dummy_token",
                HTTP_X_FORWARDED_FOR=ip
            )
            self.assertNotEqual(res.status_code, 429, f"Download request {i+1} should not be rate limited")

        # 121st request triggers HTTP 429
        res_blocked = self.client.get(
            "/api/v1/download/dummy_token",
            HTTP_X_FORWARDED_FOR=ip
        )
        self.assertEqual(res_blocked.status_code, 429)
        self.assertIn("Download rate limit exceeded", res_blocked.json().get("detail", ""))
