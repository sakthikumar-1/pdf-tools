"""
MySQL 8.0 InnoDB Two-Phase Quota Engine for Simatrix PDF.
Provides sub-5ms atomic slot reservations, heartbeat lease renewal,
deadlock retry resiliency, and safe settlement with zero DB locks held during AI calls.
"""

import time
import random
import logging
from functools import wraps
from typing import Optional, Tuple, Dict, Any
from datetime import timedelta

from django.db import transaction, IntegrityError, OperationalError
from django.utils import timezone
from django.conf import settings

from apps.authentication.models import User, AIUserQuota, AIQuotaReservation, AIUsageLog
from .provider_base import AIResponse

logger = logging.getLogger(__name__)

# Constants
DEFAULT_RESERVATION_TTL_SECONDS = 90
MAX_RESERVATION_CEILING_SECONDS = 300  # Hard 5-minute absolute ceiling


class QuotaException(Exception):
    """Base exception for quota operations."""
    pass


class QuotaExceededException(QuotaException):
    """Raised when account has exhausted its 5 AI requests allowance."""
    def __init__(self, message="AI limit reached (5/5 requests used). Please contact admin or upgrade.", details=None):
        super().__init__(message)
        self.details = details or {}


def retry_on_mysql_deadlock(max_retries: int = 3, backoff_base: float = 0.05):
    """
    Decorator to retry MySQL InnoDB operations on transient deadlock (1213)
    or lock wait timeout (1205) with exponential backoff and jitter.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except OperationalError as exc:
                    err_code = exc.args[0] if exc.args else 0
                    err_msg = str(exc).lower()
                    is_lock_error = err_code in (1213, 1205) or 'deadlock' in err_msg or 'lock wait' in err_msg
                    if is_lock_error and attempt < max_retries:
                        sleep_time = backoff_base * (2 ** attempt) + random.uniform(0.01, 0.04)
                        logger.warning(
                            f"[MySQL Concurrency] Contention detected (code {err_code}, attempt {attempt + 1}). "
                            f"Retrying in {sleep_time:.3f}s..."
                        )
                        time.sleep(sleep_time)
                        continue
                    raise
        return wrapper
    return decorator


def get_or_create_quota(user: User) -> AIUserQuota:
    """
    Safely retrieves or initializes an AIUserQuota row without relying on
    select_for_update() on a non-existent row (avoiding MySQL gap locks).
    Safely handles concurrent initialization via atomic IntegrityError catch.
    """
    try:
        return AIUserQuota.objects.get(user=user)
    except AIUserQuota.DoesNotExist:
        try:
            with transaction.atomic():
                quota, _ = AIUserQuota.objects.get_or_create(
                    user=user,
                    defaults={'total_allowed': 5, 'used_count': 0, 'is_blocked': False}
                )
                return quota
        except IntegrityError:
            # Another concurrent thread already created the quota record
            return AIUserQuota.objects.get(user=user)


@retry_on_mysql_deadlock(max_retries=3)
def reserve_slot(
    user: User,
    idempotency_key: str,
    tool_type: str = "general",
    ttl_seconds: int = DEFAULT_RESERVATION_TTL_SECONDS
) -> Tuple[AIQuotaReservation, bool, str]:
    """
    Phase 1: Sub-5ms atomic quota reservation.
    Checks user allowance, auto-expires stale slots, and allocates a reservation.
    
    Idempotency Handling:
    If a reservation already exists with this idempotency key:
    - Returns (existing_reservation, created=False, state)
    - NEVER creates a second reservation or charges twice.

    Returns:
    Tuple[AIQuotaReservation, created: bool, state_message: str]
    """
    now = timezone.now()

    # 1. Check existing idempotency key first
    existing = AIQuotaReservation.objects.filter(user=user, idempotency_key=idempotency_key).first()
    if existing:
        if existing.status == 'RESERVED':
            if existing.expires_at > now:
                return existing, False, "IN_PROGRESS"
            else:
                # Mark expired
                with transaction.atomic():
                    existing.status = 'EXPIRED'
                    existing.settled_at = now
                    existing.save(update_fields=['status', 'settled_at'])
                return existing, False, "EXPIRED"
        return existing, False, existing.status

    # 2. Ensure quota row exists safely
    quota = get_or_create_quota(user)

    # 3. Enter short atomic transaction for row-level locked allocation
    with transaction.atomic():
        # Clean up stale unrenewed reservations for this user
        AIQuotaReservation.objects.filter(
            user=user,
            status='RESERVED',
            expires_at__lt=now
        ).update(status='EXPIRED', settled_at=now)

        # Acquire exclusive row lock on the guaranteed-existing AIUserQuota row
        locked_quota = AIUserQuota.objects.select_for_update().get(id=quota.id)

        if locked_quota.is_blocked:
            raise QuotaExceededException(
                "Account has been blocked from accessing AI services. Please contact support.",
                details={"is_blocked": True}
            )

        # Count active unexpired reservations
        active_reservations = AIQuotaReservation.objects.filter(
            user=user,
            status='RESERVED',
            expires_at__gte=now
        ).count()

        total_committed = locked_quota.used_count + active_reservations
        if total_committed >= locked_quota.total_allowed:
            raise QuotaExceededException(
                f"AI limit reached ({locked_quota.used_count}/{locked_quota.total_allowed} requests used). "
                "Please contact admin or upgrade.",
                details={
                    "total": locked_quota.total_allowed,
                    "used": locked_quota.used_count,
                    "remaining": max(0, locked_quota.total_allowed - locked_quota.used_count)
                }
            )

        # Create the reservation inside the transaction
        expires_at = now + timedelta(seconds=ttl_seconds)
        try:
            reservation = AIQuotaReservation.objects.create(
                user=user,
                idempotency_key=idempotency_key,
                tool_type=tool_type,
                status='RESERVED',
                expires_at=expires_at
            )
            return reservation, True, "RESERVED"
        except IntegrityError:
            # Concurrent race created reservation with exact same idempotency key
            winner = AIQuotaReservation.objects.get(user=user, idempotency_key=idempotency_key)
            return winner, False, "IN_PROGRESS"


@retry_on_mysql_deadlock(max_retries=3)
def renew_reservation(
    reservation_id,
    extension_seconds: int = 60,
    max_ceiling_seconds: int = MAX_RESERVATION_CEILING_SECONDS
) -> bool:
    """
    Heartbeat renewal for long-running / multi-chunk AI operations.
    Extends the reservation lease while enforcing a hard 5-minute absolute ceiling.
    """
    now = timezone.now()
    with transaction.atomic():
        reservation = AIQuotaReservation.objects.select_for_update().filter(id=reservation_id).first()
        if not reservation or reservation.status != 'RESERVED':
            return False

        # Enforce hard ceiling from creation time
        elapsed = (now - reservation.created_at).total_seconds()
        if elapsed >= max_ceiling_seconds:
            logger.warning(
                f"[Quota Renewal] Reservation {reservation_id} reached hard ceiling of {max_ceiling_seconds}s. "
                "Renewal denied to prevent orphaned slots."
            )
            return False

        new_expires_at = min(
            now + timedelta(seconds=extension_seconds),
            reservation.created_at + timedelta(seconds=max_ceiling_seconds)
        )
        reservation.expires_at = new_expires_at
        reservation.save(update_fields=['expires_at'])
        return True


@retry_on_mysql_deadlock(max_retries=3)
def settle_reservation(
    reservation_id,
    success: bool,
    ai_response: Optional[AIResponse] = None,
    error_message: str = "",
    tool_type: str = "general",
    ip_address: Optional[str] = None
) -> Dict[str, Any]:
    """
    Phase 3: Sub-5ms atomic settlement.
    Executed after external AI call finishes.
    
    If success:
      - Marks reservation 'CONSUMED'
      - Increments AIUserQuota.used_count by 1
      - Logs sanitized audit record
    If failure / aborted / cancelled:
      - Marks reservation 'RELEASED'
      - Zero quota deducted
      - Logs sanitized failure record
      
    Prevents duplicate settlements.
    """
    now = timezone.now()

    with transaction.atomic():
        reservation = AIQuotaReservation.objects.select_for_update().filter(id=reservation_id).first()
        if not reservation:
            return {"error": "Reservation not found"}

        # Guard against duplicate settlement
        if reservation.status in ('CONSUMED', 'RELEASED'):
            quota = AIUserQuota.objects.get(user=reservation.user)
            return {
                "settled": True,
                "already_settled": True,
                "status": reservation.status,
                "quota": {
                    "total": quota.total_allowed,
                    "used": quota.used_count,
                    "remaining": max(0, quota.total_allowed - quota.used_count)
                }
            }

        quota = AIUserQuota.objects.select_for_update().get(user=reservation.user)

        if success:
            reservation.status = 'CONSUMED'
            reservation.settled_at = now
            reservation.save(update_fields=['status', 'settled_at'])

            quota.used_count += 1
            quota.save(update_fields=['used_count', 'updated_at'])

            # Calculate estimated USD cost
            prompt_tokens = ai_response.prompt_tokens if ai_response else 0
            completion_tokens = ai_response.completion_tokens if ai_response else 0
            total_tokens = ai_response.total_tokens if ai_response else (prompt_tokens + completion_tokens)
            provider_used = ai_response.provider if ai_response else "unknown"
            model_used = ai_response.model if ai_response else "unknown"
            exec_ms = ai_response.execution_time_ms if ai_response else 0

            # Dynamic price estimation
            cost_usd = 0.0
            if provider_used == 'deepseek':
                cost_usd = (prompt_tokens * 0.00000014) + (completion_tokens * 0.00000028)
            elif provider_used == 'gemini':
                cost_usd = (prompt_tokens * 0.000000075) + (completion_tokens * 0.00000030)

            # Insert sanitized audit log
            AIUsageLog.objects.create(
                user=reservation.user,
                reservation=reservation,
                tool_type=reservation.tool_type or tool_type,
                provider_used=provider_used,
                model_used=model_used,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
                estimated_cost_usd=round(cost_usd, 6),
                execution_time_ms=exec_ms,
                fallback_occurred=bool(ai_response and ai_response.raw_metadata.get("fallback", False)),
                success=True,
                ip_address=ip_address
            )
        else:
            # Operation failed, cancelled, or aborted
            reservation.status = 'RELEASED'
            reservation.settled_at = now
            reservation.save(update_fields=['status', 'settled_at'])

            # Log failure with sanitized error message
            sanitized_err = AIUsageLog.sanitize_error_message(error_message)
            AIUsageLog.objects.create(
                user=reservation.user,
                reservation=reservation,
                tool_type=reservation.tool_type or tool_type,
                provider_used=ai_response.provider if ai_response else "unknown",
                model_used=ai_response.model if ai_response else "none",
                prompt_tokens=0,
                completion_tokens=0,
                total_tokens=0,
                success=False,
                error_message=sanitized_err,
                ip_address=ip_address
            )

        return {
            "settled": True,
            "status": reservation.status,
            "quota": {
                "total": quota.total_allowed,
                "used": quota.used_count,
                "remaining": max(0, quota.total_allowed - quota.used_count)
            }
        }


def get_user_quota_summary(user: User) -> Dict[str, Any]:
    """
    Returns current user quota allowance, consumed count, and active reservations.
    """
    now = timezone.now()
    quota = get_or_create_quota(user)

    active_reservations = AIQuotaReservation.objects.filter(
        user=user,
        status='RESERVED',
        expires_at__gte=now
    ).count()

    remaining = max(0, quota.total_allowed - (quota.used_count + active_reservations))

    return {
        "total": quota.total_allowed,
        "used": quota.used_count,
        "active_reservations": active_reservations,
        "remaining": remaining,
        "is_limit_reached": (quota.used_count >= quota.total_allowed) or quota.is_blocked,
        "is_blocked": quota.is_blocked
    }

