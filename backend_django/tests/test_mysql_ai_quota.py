"""
MySQL 8.0 InnoDB Concurrency & Quota Integration Test Suite.
Validates row-level locking, 10-thread parallel reservations, idempotency,
deadlock retries, heartbeat renewal, expiry, and sanitized logging on MySQL.
"""

import time
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import timedelta

from django.test import TransactionTestCase
from django.db import connection, connections, OperationalError
from django.utils import timezone

from apps.authentication.models import User, AIUserQuota, AIQuotaReservation, AIUsageLog
from ai.quota import (
    get_or_create_quota,
    reserve_slot,
    renew_reservation,
    settle_reservation,
    get_user_quota_summary,
    retry_on_mysql_deadlock,
    QuotaExceededException
)
from ai.provider_base import AIResponse


class MySQLAIQuotaConcurrencyTests(TransactionTestCase):
    """
    Integration tests specifically designed for MySQL InnoDB transaction semantics.
    Uses TransactionTestCase so transactions are committed and isolated per thread.
    """

    def setUp(self):
        super().setUp()
        self.user = User.objects.create(
            email=f"quota_test_{uuid.uuid4().hex[:8]}@simatrix.test",
            username=f"user_{uuid.uuid4().hex[:8]}"
        )
        self.quota = get_or_create_quota(self.user)

    def tearDown(self):
        # Clean up database after each test
        AIUsageLog.objects.filter(user=self.user).delete()
        AIQuotaReservation.objects.filter(user=self.user).delete()
        AIUserQuota.objects.filter(user=self.user).delete()
        self.user.delete()
        super().tearDown()

    def test_safe_quota_row_initialization(self):
        """Verify that get_or_create_quota safely initializes without gap lock errors."""
        new_user = User.objects.create(
            email=f"init_test_{uuid.uuid4().hex[:8]}@simatrix.test",
            username=f"init_{uuid.uuid4().hex[:8]}"
        )
        try:
            # First fetch initializes
            q1 = get_or_create_quota(new_user)
            self.assertEqual(q1.total_allowed, 5)
            self.assertEqual(q1.used_count, 0)
            self.assertFalse(q1.is_blocked)

            # Second fetch retrieves existing row
            q2 = get_or_create_quota(new_user)
            self.assertEqual(q1.id, q2.id)
        finally:
            AIUserQuota.objects.filter(user=new_user).delete()
            new_user.delete()

    def test_ten_concurrent_reservation_attempts_strict_cap(self):
        """
        Requirement 9: Test 10 concurrent threads simultaneously requesting a quota slot.
        Confirm that exactly 5 succeed and exactly 5 receive QuotaExceededException.
        Total active reservations must never exceed 5.
        """
        user_id = self.user.id
        results = []
        errors = []

        def worker_task(thread_idx):
            # Close connection so this thread acquires its own independent database connection
            connection.close()
            worker_user = User.objects.get(id=user_id)
            idempotency_key = f"thread_key_{thread_idx}_{uuid.uuid4().hex[:6]}"

            try:
                res, created, status = reserve_slot(
                    user=worker_user,
                    idempotency_key=idempotency_key,
                    tool_type="summarizer"
                )
                return {"success": True, "res_id": res.id, "created": created, "status": status}
            except QuotaExceededException as exc:
                return {"success": False, "error": str(exc)}
            finally:
                connection.close()

        # Launch 10 worker threads simultaneously
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(worker_task, i) for i in range(10)]
            for future in as_completed(futures):
                res = future.result()
                if res["success"]:
                    results.append(res)
                else:
                    errors.append(res)

        # Reopen connection for assertions
        connection.close()
        self.assertEqual(len(results), 5, f"Expected exactly 5 successful reservations, got {len(results)}")
        self.assertEqual(len(errors), 5, f"Expected exactly 5 quota rejections, got {len(errors)}")

        # Verify database state in MySQL InnoDB
        active_count = AIQuotaReservation.objects.filter(
            user=self.user,
            status='RESERVED'
        ).count()
        self.assertEqual(active_count, 5, "Total active reservations in MySQL must be strictly 5")

    def test_idempotency_key_returns_existing_state(self):
        """
        Requirement 2: Repeated requests with the same key must return existing
        state and must never create duplicate reservations.
        """
        key = f"idem_key_{uuid.uuid4().hex}"

        # 1. First reservation
        res1, created1, status1 = reserve_slot(self.user, key, "summarizer")
        self.assertTrue(created1)
        self.assertEqual(status1, "RESERVED")

        # 2. Second call with SAME key while RESERVED
        res2, created2, status2 = reserve_slot(self.user, key, "summarizer")
        self.assertFalse(created2)
        self.assertEqual(status2, "IN_PROGRESS")
        self.assertEqual(res1.id, res2.id)

        # 3. Settle reservation
        settle_reservation(
            res1.id,
            success=True,
            ai_response=AIResponse(
                content="Result",
                provider="deepseek",
                model="deepseek-chat",
                prompt_tokens=100,
                completion_tokens=50
            )
        )

        # 4. Third call with SAME key after CONSUMED
        res3, created3, status3 = reserve_slot(self.user, key, "summarizer")
        self.assertFalse(created3)
        self.assertEqual(status3, "CONSUMED")
        self.assertEqual(res1.id, res3.id)

        # Confirm only ONE row exists in MySQL table
        count = AIQuotaReservation.objects.filter(user=self.user, idempotency_key=key).count()
        self.assertEqual(count, 1)

    def test_heartbeat_renewal_and_hard_ceiling(self):
        """
        Requirement 10: Verify heartbeat reservation renewal extends expires_at
        and respects the 300-second absolute ceiling.
        """
        key = f"renew_key_{uuid.uuid4().hex}"
        res, created, _ = reserve_slot(self.user, key, "chat", ttl_seconds=60)
        original_expires = res.expires_at

        # Renew by 60s
        time.sleep(0.05)
        success = renew_reservation(res.id, extension_seconds=90)
        self.assertTrue(success)

        res.refresh_from_db()
        self.assertGreater(res.expires_at, original_expires)

        # Simulate reservation that was created 305 seconds ago (past hard ceiling)
        res.created_at = timezone.now() - timedelta(seconds=305)
        res.save(update_fields=['created_at'])

        # Renewal must now fail
        ceiling_success = renew_reservation(res.id, extension_seconds=60, max_ceiling_seconds=300)
        self.assertFalse(ceiling_success, "Heartbeat renewal must reject once 300s ceiling is breached")

    def test_stale_reservation_auto_expiry_frees_slot(self):
        """
        Requirement 10: Stale unrenewed reservations are expired on subsequent checks,
        freeing the slot for fresh requests.
        """
        # Create 5 reservations with expired timestamps
        past = timezone.now() - timedelta(seconds=120)
        for i in range(5):
            AIQuotaReservation.objects.create(
                user=self.user,
                idempotency_key=f"stale_{i}_{uuid.uuid4().hex[:6]}",
                tool_type="summarizer",
                status='RESERVED',
                expires_at=past
            )

        # User should not be blocked because previous 5 are expired!
        fresh_key = f"fresh_{uuid.uuid4().hex}"
        fresh_res, created, status = reserve_slot(self.user, fresh_key, "translate")

        self.assertTrue(created)
        self.assertEqual(status, "RESERVED")

        # Verify old reservations were marked EXPIRED
        expired_count = AIQuotaReservation.objects.filter(user=self.user, status='EXPIRED').count()
        self.assertEqual(expired_count, 5)

    def test_settle_success_vs_release_on_failure(self):
        """
        Requirement 10: Successful settlement increments used_count and writes audit log.
        Failed settlement releases slot without incrementing used_count.
        """
        # --- 1. Successful execution ---
        k1 = f"success_key_{uuid.uuid4().hex}"
        r1, _, _ = reserve_slot(self.user, k1, "summarizer")

        outcome1 = settle_reservation(
            r1.id,
            success=True,
            ai_response=AIResponse(
                content="Summary output",
                provider="deepseek",
                model="deepseek-chat",
                prompt_tokens=200,
                completion_tokens=80,
                execution_time_ms=1200
            )
        )
        self.assertTrue(outcome1["settled"])
        self.assertEqual(outcome1["quota"]["used"], 1)
        self.assertEqual(outcome1["quota"]["remaining"], 4)

        # Verify audit log
        log1 = AIUsageLog.objects.filter(reservation=r1).first()
        self.assertIsNotNone(log1)
        self.assertTrue(log1.success)
        self.assertEqual(log1.provider_used, "deepseek")
        self.assertEqual(log1.prompt_tokens, 200)
        self.assertEqual(log1.completion_tokens, 80)
        self.assertGreater(log1.estimated_cost_usd, 0)

        # --- 2. Failed execution ---
        k2 = f"fail_key_{uuid.uuid4().hex}"
        r2, _, _ = reserve_slot(self.user, k2, "chat")

        outcome2 = settle_reservation(
            r2.id,
            success=False,
            error_message="Provider timeout after 45s",
            tool_type="chat"
        )
        self.assertTrue(outcome2["settled"])
        self.assertEqual(outcome2["status"], "RELEASED")
        self.assertEqual(outcome2["quota"]["used"], 1)  # used_count stays 1!
        self.assertEqual(outcome2["quota"]["remaining"], 4)

        # Verify failure audit log
        log2 = AIUsageLog.objects.filter(reservation=r2).first()
        self.assertIsNotNone(log2)
        self.assertFalse(log2.success)
        self.assertIn("Provider timeout", log2.error_message)

    def test_duplicate_settlement_idempotency(self):
        """
        Requirement 10: Settle called twice on same reservation does not double-increment.
        """
        key = f"dup_settle_{uuid.uuid4().hex}"
        res, _, _ = reserve_slot(self.user, key, "summarizer")

        # First settlement
        out1 = settle_reservation(res.id, success=True, ai_response=AIResponse(content="OK", provider="deepseek", model="deepseek-chat"))
        self.assertEqual(out1["quota"]["used"], 1)

        # Second settlement attempt
        out2 = settle_reservation(res.id, success=True, ai_response=AIResponse(content="OK", provider="deepseek", model="deepseek-chat"))
        self.assertTrue(out2.get("already_settled", False))
        self.assertEqual(out2["quota"]["used"], 1, "Duplicate settlement must NOT double increment used_count")

    def test_sanitized_error_message_logging(self):
        """
        Requirement 4: Verify sensitive tokens and keys are redacted from error logs.
        """
        sensitive_msg = (
            "Error with key sk-proj-123456789012345678901234567890 and "
            "Gemini key AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6 and "
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secret"
        )
        sanitized = AIUsageLog.sanitize_error_message(sensitive_msg)

        self.assertNotIn("sk-proj-", sanitized)
        self.assertNotIn("AIzaSy", sanitized)
        self.assertNotIn("eyJhbG", sanitized)
        self.assertIn("[REDACTED_API_KEY]", sanitized)
        self.assertIn("[REDACTED_TOKEN]", sanitized)

    def test_mysql_deadlock_retry_decorator(self):
        """
        Requirement 6: Deadlock retry recovers on transient OperationalError.
        """
        attempts = 0

        @retry_on_mysql_deadlock(max_retries=3, backoff_base=0.01)
        def flaky_db_op():
            nonlocal attempts
            attempts += 1
            if attempts == 1:
                # Simulate MySQL 1213 deadlock error
                raise OperationalError(1213, "Deadlock found when trying to get lock; try restarting transaction")
            return "SUCCESS"

        result = flaky_db_op()
        self.assertEqual(result, "SUCCESS")
        self.assertEqual(attempts, 2, "Expected flaky operation to succeed on 2nd attempt")

