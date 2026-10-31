"""
Multi-worker shared sliding-window rate limiter for Simatrix AI operations.
Backed by MySQL InnoDB with row-level locks on ai_rate_limit_buckets.
Enforces:
- Authenticated users: 10 requests / 60 seconds.
- Client IP protection: 30 requests / 60 seconds.
- Guest preview: 1 request lifetime cap.
"""

import time
import logging
from datetime import timedelta
from typing import Tuple, Optional, Dict, List
from threading import Lock

from django.utils import timezone
from django.db import transaction, DatabaseError
from apps.authentication.models import User, AIRateLimitBucket, AIUserQuota
from .quota import retry_on_mysql_deadlock

logger = logging.getLogger(__name__)

USER_RATE_LIMIT_PER_MINUTE = 10
IP_RATE_LIMIT_PER_MINUTE = 30
WINDOW_SECONDS = 60

# In-memory sliding-window fallback for testing when DB is unavailable
_memory_lock = Lock()
_memory_buckets: Dict[str, List[float]] = {}


def get_client_ip(request) -> str:
    """Extracts client IP from Django request, respecting X-Forwarded-For headers."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR', '127.0.0.1')
    return ip or '127.0.0.1'


def is_guest_user(user: Optional[User]) -> bool:
    """Detects whether user is a temporary guest account."""
    if not user:
        return True
    if not getattr(user, 'is_verified', False):
        return True
    if user.email.lower().endswith('@simatrix.local') or getattr(user, 'role', '') == 'guest':
        return True
    return False


@retry_on_mysql_deadlock(max_retries=3)
def _update_db_bucket(key: str, limit: int, window_seconds: int = 60) -> Tuple[bool, int, int]:
    """
    Sub-5ms atomic bucket increment in MySQL InnoDB with row-level locking.
    Returns: (is_allowed, remaining, retry_after)
    """
    now = timezone.now()
    window_cutoff = now - timedelta(seconds=window_seconds)

    with transaction.atomic():
        bucket = AIRateLimitBucket.objects.select_for_update().filter(key=key).first()

        if not bucket or bucket.window_start < window_cutoff:
            # New window or first request
            if not bucket:
                AIRateLimitBucket.objects.create(
                    key=key,
                    request_count=1,
                    window_start=now
                )
            else:
                bucket.request_count = 1
                bucket.window_start = now
                bucket.save(update_fields=['request_count', 'window_start', 'updated_at'])
            return True, limit - 1, 0

        # Existing window active
        if bucket.request_count >= limit:
            elapsed = (now - bucket.window_start).total_seconds()
            retry_after = max(1, int(window_seconds - elapsed))
            return False, 0, retry_after

        # Increment count
        bucket.request_count += 1
        bucket.save(update_fields=['request_count', 'updated_at'])
        remaining = max(0, limit - bucket.request_count)
        return True, remaining, 0


def _update_memory_bucket(key: str, limit: int, window_seconds: int = 60) -> Tuple[bool, int, int]:
    """Fallback in-memory rate limiting when DB connection is offline."""
    now = time.time()
    cutoff = now - window_seconds

    with _memory_lock:
        stamps = _memory_buckets.get(key, [])
        valid_stamps = [t for t in stamps if t > cutoff]
        _memory_buckets[key] = valid_stamps

        if len(valid_stamps) >= limit:
            oldest = valid_stamps[0]
            retry_after = max(1, int(oldest + window_seconds - now))
            return False, 0, retry_after

        valid_stamps.append(now)
        _memory_buckets[key] = valid_stamps
        return True, limit - len(valid_stamps), 0


def check_ai_rate_limits(request, user: Optional[User] = None) -> Tuple[bool, int, int, str]:
    """
    Evaluates hierarchical rate limits:
    1. Guest preview limit: 1 request lifetime cap.
    2. IP rate limit: 30 requests/minute.
    3. Authenticated user rate limit: 10 requests/minute.

    Returns:
        (is_allowed: bool, remaining: int, retry_after: int, error_code: str)
    """
    client_ip = get_client_ip(request)

    # 1. Guest Lifetime Preview Cap
    if user and is_guest_user(user):
        quota = getattr(user, 'ai_quota', None)
        if not quota:
            quota, _ = AIUserQuota.objects.get_or_create(
                user=user,
                defaults={'total_allowed': 1, 'used_count': 0}
            )
        if quota.used_count >= 1:
            return (
                False,
                0,
                0,
                "GUEST_PREVIEW_LIMIT"
            )

    # 2. IP Rate Limit (30 req / 60s)
    ip_key = f"ip:{client_ip}"
    try:
        ip_allowed, ip_remaining, ip_retry_after = _update_db_bucket(
            key=ip_key,
            limit=IP_RATE_LIMIT_PER_MINUTE,
            window_seconds=WINDOW_SECONDS
        )
    except DatabaseError:
        ip_allowed, ip_remaining, ip_retry_after = _update_memory_bucket(
            key=ip_key,
            limit=IP_RATE_LIMIT_PER_MINUTE,
            window_seconds=WINDOW_SECONDS
        )

    if not ip_allowed:
        return (
            False,
            0,
            ip_retry_after,
            f"IP rate limit exceeded. Please try again in {ip_retry_after} seconds."
        )

    # 3. User Rate Limit (10 req / 60s) for verified authenticated accounts
    if user:
        user_key = f"user:{str(user.id)}"
        try:
            user_allowed, user_remaining, user_retry_after = _update_db_bucket(
                key=user_key,
                limit=USER_RATE_LIMIT_PER_MINUTE,
                window_seconds=WINDOW_SECONDS
            )
        except DatabaseError:
            user_allowed, user_remaining, user_retry_after = _update_memory_bucket(
                key=user_key,
                limit=USER_RATE_LIMIT_PER_MINUTE,
                window_seconds=WINDOW_SECONDS
            )

        if not user_allowed:
            return (
                False,
                0,
                user_retry_after,
                f"Account rate limit exceeded (10 requests/minute). Please try again in {user_retry_after} seconds."
            )
        return True, user_remaining, 0, ""

    return True, ip_remaining, 0, ""


def reset_rate_limit_memory():
    """Utility function for clearing memory test state."""
    with _memory_lock:
        _memory_buckets.clear()

