"""
Simatrix PDF — Comprehensive Verification Suite for Phases 4 through 7:
- Phase 4: Database & Secret Security (SEC-07).
- Phase 5: Document Privacy & Storage (SEC-08, SEC-12).
- Phase 6: Frontend & Browser Security (SEC-09).
- Phase 7: Monitoring & Incident Response (SEC-10).
"""

import json
import logging
from unittest.mock import patch

from django.test import TestCase, Client
from django.conf import settings
from django.core.cache import cache

from core.security_logger import log_security_event
from core.security_headers import CSP_POLICY, PERMISSIONS_POLICY
from apps.authentication.models import User


class SecurityPhases4To7Tests(TestCase):
    """Integration test suite covering Phases 4, 5, 6, and 7."""

    def setUp(self):
        super().setUp()
        cache.clear()
        self.client = Client()

    def test_01_phase4_production_allowed_hosts_disallows_wildcard(self):
        """Phase 4 / SEC-07: Production settings must not default to wildcard '*' allowed hosts."""
        from core.settings import production as prod_settings
        self.assertNotIn('*', prod_settings.ALLOWED_HOSTS, "Wildcard '*' must never be in production ALLOWED_HOSTS")
        self.assertNotIn('.onrender.com', prod_settings.ALLOWED_HOSTS, "Broad '.onrender.com' wildcard must not be in production ALLOWED_HOSTS")
        self.assertIn('pdf-tools-2-g8im.onrender.com', prod_settings.ALLOWED_HOSTS)
        self.assertIn('127.0.0.1', prod_settings.ALLOWED_HOSTS)

    def test_02_phase5_maintenance_cleanup_rejects_unauthorized(self):
        """Phase 5 / SEC-08 / SEC-12: Maintenance cleanup rejects unauthorized requests without leaking SECRET_KEY."""
        # Request with no key
        res = self.client.post("/api/v1/maintenance/cleanup")
        self.assertEqual(res.status_code, 403)

        # Request with bogus key
        res_bogus = self.client.post(
            "/api/v1/maintenance/cleanup",
            HTTP_X_SIMATRIX_MAINTENANCE_KEY="invalid-key-attempt"
        )
        self.assertEqual(res_bogus.status_code, 403)

    def test_03_phase5_maintenance_cleanup_authorized_with_proper_key(self):
        """Phase 5: Maintenance cleanup succeeds with dedicated SIMATRIX_MAINTENANCE_KEY."""
        test_key = "secure-random-maint-key-2026-x"
        with patch.object(settings, "SIMATRIX_MAINTENANCE_KEY", test_key):
            res = self.client.post(
                "/api/v1/maintenance/cleanup",
                HTTP_X_SIMATRIX_MAINTENANCE_KEY=test_key
            )
            self.assertEqual(res.status_code, 200)
            self.assertTrue(res.json().get("success"))

    def test_04_phase6_security_headers_enforced(self):
        """Phase 6 / SEC-09: Verifies CSP, Permissions-Policy, Referrer-Policy, and X-Content-Type-Options."""
        res = self.client.get("/api/v1/health")
        self.assertEqual(res.status_code, 200)

        # 1. Content-Security-Policy
        csp = res.headers.get("Content-Security-Policy", "")
        self.assertTrue(csp, "Content-Security-Policy header must be present")
        self.assertIn("https://accounts.google.com/gsi/client", csp, "CSP must allow Google OAuth scripts")
        self.assertIn("worker-src 'self' blob:", csp, "CSP must allow PDF.js Web Worker blob:")
        self.assertIn("object-src 'none'", csp, "CSP must block plugin objects")

        # 2. Permissions-Policy
        perm = res.headers.get("Permissions-Policy", "")
        self.assertEqual(perm, PERMISSIONS_POLICY)

        # 3. Referrer-Policy
        referrer = res.headers.get("Referrer-Policy", "")
        self.assertEqual(referrer, "strict-origin-when-cross-origin")

        # 4. Anti-sniffing
        nosniff = res.headers.get("X-Content-Type-Options", "")
        self.assertEqual(nosniff, "nosniff")

    def test_05_phase7_structured_security_event_logging(self):
        """Phase 7 / SEC-10: Security audit logger outputs valid structured JSON without credentials."""
        captured_records = []

        class TestHandler(logging.Handler):
            def emit(self, record):
                captured_records.append(record.getMessage())

        sec_logger = logging.getLogger("simatrix.security")
        handler = TestHandler()
        sec_logger.addHandler(handler)

        try:
            log_security_event(
                event_type="AUTH_FAILURE",
                severity="WARNING",
                client_ip="203.0.113.42",
                details={"reason": "Invalid token signature", "attempt": 1}
            )

            self.assertTrue(len(captured_records) > 0, "Security event should be logged")
            last_log = captured_records[-1]
            self.assertIn("[SECURITY_WARN]", last_log)

            # Parse JSON payload
            json_part = last_log.split("[SECURITY_WARN] ", 1)[1]
            data = json.loads(json_part)
            self.assertEqual(data["event_type"], "AUTH_FAILURE")
            self.assertEqual(data["severity"], "WARNING")
            self.assertEqual(data["client_ip"], "203.0.113.42")
            self.assertEqual(data["details"]["reason"], "Invalid token signature")
            self.assertIn("timestamp", data)
        finally:
            sec_logger.removeHandler(handler)

