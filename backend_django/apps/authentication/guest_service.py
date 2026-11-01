"""
Simatrix PDF - Persistent Anonymous Guest Identity & Device-Level Limit Service.
Implements cryptographically secure, privacy-preserving device tokens stored via
HttpOnly cookies, hashed with SHA-256 in MySQL InnoDB, and enforcing a strict 1-operation
lifetime cap across all AI utilities.
"""

import hashlib
import logging
import secrets
import uuid
from typing import Tuple, Optional
from datetime import timedelta

from django.conf import settings
from django.db import transaction, IntegrityError
from django.http import HttpRequest, HttpResponse
from django.utils import timezone

from apps.authentication.models import User, GuestDeviceIdentity, AIUserQuota, AIRateLimitBucket
from ai.quota import retry_on_mysql_deadlock

logger = logging.getLogger(__name__)

# Constants
GUEST_DEVICE_COOKIE_NAME = "simatrix_device_token"
GUEST_COOKIE_MAX_AGE = 365 * 24 * 3600  # 1 year in seconds
GUEST_CREATION_LIMIT_PER_IP = 20        # Max 20 new guest accounts per IP / 10 minutes
GUEST_CREATION_WINDOW_SECONDS = 600     # 10 minutes sliding window


class GuestIdentityException(Exception):
    """Base exception for guest identity management."""
    pass


class GuestRevokedError(GuestIdentityException):
    """Raised when a device profile has been marked revoked/inactive."""
    pass


class GuestAbuseLimitError(GuestIdentityException):
    """Raised when suspicious guest generation rates are detected from an IP."""
    pass


def hash_device_token(raw_token: str) -> str:
    """
    Computes a cryptographic SHA-256 hash of the raw secret device token.
    Only the hash is persisted in the database; raw tokens are never logged or stored.
    """
    if not raw_token:
        return ""
    return hashlib.sha256(raw_token.strip().encode("utf-8")).hexdigest()


def get_client_ip(request: HttpRequest) -> str:
    """Extracts client IP from Django request, respecting X-Forwarded-For."""
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        ip = x_forwarded_for.split(",")[0].strip()
    else:
        ip = request.META.get("REMOTE_ADDR", "127.0.0.1")
    return ip or "127.0.0.1"


def check_guest_creation_abuse(client_ip: str) -> Tuple[bool, str]:
    """
    Secondary abuse protection:
    Restricts excessive guest device creation from a single IP (e.g. bots/scrapers)
    without penalizing multiple legitimate students/colleagues on a shared network.
    """
    now = timezone.now()
    window_cutoff = now - timedelta(seconds=GUEST_CREATION_WINDOW_SECONDS)
    key = f"guest_creation_ip:{client_ip}"

    try:
        with transaction.atomic():
            bucket = AIRateLimitBucket.objects.select_for_update().filter(key=key).first()
            if not bucket or bucket.window_start < window_cutoff:
                if not bucket:
                    AIRateLimitBucket.objects.create(
                        key=key,
                        request_count=1,
                        window_start=now
                    )
                else:
                    bucket.request_count = 1
                    bucket.window_start = now
                    bucket.save(update_fields=["request_count", "window_start", "updated_at"])
                return True, ""

            if bucket.request_count >= GUEST_CREATION_LIMIT_PER_IP:
                logger.warning(f"[Abuse Protection] Rate limit triggered: {client_ip} exceeded {GUEST_CREATION_LIMIT_PER_IP} guest creations.")
                return False, "Too many guest registrations from this network. Please sign in with Google or try again later."

            bucket.request_count += 1
            bucket.save(update_fields=["request_count", "updated_at"])
            return True, ""
    except Exception as exc:
        logger.warning(f"[Abuse Protection] DB check fallback warning: {exc}")
        return True, ""


def extract_raw_device_token(request: HttpRequest) -> Optional[str]:
    """
    Extracts raw anonymous device token from request:
    1. HttpOnly Cookie: simatrix_device_token
    2. Custom Header: X-Device-Token (fallback for non-cookie API testing)
    """
    raw_token = request.COOKIES.get(GUEST_DEVICE_COOKIE_NAME)
    if not raw_token:
        raw_token = request.headers.get("X-Device-Token")
    if raw_token:
        raw_token = raw_token.strip()
    return raw_token or None


def attach_guest_cookie(response: HttpResponse, raw_token: str) -> None:
    """Sets a secure persistent HttpOnly cookie on the response."""
    if not response or not raw_token:
        return
    is_secure = getattr(settings, "SESSION_COOKIE_SECURE", False) or not settings.DEBUG
    response.set_cookie(
        key=GUEST_DEVICE_COOKIE_NAME,
        value=raw_token,
        max_age=GUEST_COOKIE_MAX_AGE,
        httponly=True,
        samesite="Lax",
        secure=is_secure
    )


@retry_on_mysql_deadlock(max_retries=3)
def get_or_create_guest_identity(
    request: HttpRequest,
    response: Optional[HttpResponse] = None
) -> Tuple[GuestDeviceIdentity, str, bool]:
    """
    Idempotent Guest Identity resolution:
    1. If the request provides an existing valid device token, looks up the persistent
       GuestDeviceIdentity record and returns the existing guest user and guest_id.
    2. If no valid token is provided, creates ONE new GuestDeviceIdentity linked to a
       new guest User, initialises 1 AI quota, sets the HttpOnly cookie, and returns it.
    
    Returns:
        Tuple[identity: GuestDeviceIdentity, raw_token: str, created: bool]
    """
    raw_token = extract_raw_device_token(request)
    client_ip = get_client_ip(request)
    user_agent = request.META.get("HTTP_USER_AGENT", "")[:255]

    # --- 1. Attempt to reuse existing persistent guest profile ---
    if raw_token:
        token_hash = hash_device_token(raw_token)
        identity = (
            GuestDeviceIdentity.objects
            .select_related("user", "user__ai_quota")
            .filter(device_token_hash=token_hash)
            .first()
        )
        if identity:
            if not identity.is_active:
                raise GuestRevokedError("This guest device profile has been revoked. Please sign in with Google.")

            # Update last activity timestamps
            identity.last_seen = timezone.now()
            identity.last_ip = client_ip
            if user_agent and not identity.user_agent:
                identity.user_agent = user_agent
            identity.save(update_fields=["last_seen", "last_ip", "user_agent"])

            # Ensure cookie is kept fresh
            if response:
                attach_guest_cookie(response, raw_token)

            return identity, raw_token, False

    # --- 2. Check Secondary Abuse Protection before creating a new guest profile ---
    allowed, abuse_msg = check_guest_creation_abuse(client_ip)
    if not allowed:
        raise GuestAbuseLimitError(abuse_msg)

    # --- 3. Create a brand-new cryptographically secure guest identity ---
    new_raw_token = secrets.token_urlsafe(32)
    new_token_hash = hash_device_token(new_raw_token)
    guest_uuid = uuid.uuid4().hex[:10]
    guest_id = f"gst_{guest_uuid}"
    email = f"{guest_id}@simatrix.local"
    username = f"guest_{guest_id}"

    with transaction.atomic():
        # Create Guest User
        guest_user = User.objects.create(
            email=email,
            username=username,
            full_name="Guest User",
            is_verified=False,
            role="guest"
        )
        guest_user.set_unusable_password()
        guest_user.save(update_fields=["password"])

        # Explicitly enforce 1 operation allowance for guest quota
        quota, _ = AIUserQuota.objects.get_or_create(
            user=guest_user,
            defaults={"total_allowed": 1, "used_count": 0, "is_blocked": False}
        )
        if quota.total_allowed != 1:
            quota.total_allowed = 1
            quota.save(update_fields=["total_allowed"])

        # Create persistent GuestDeviceIdentity
        identity = GuestDeviceIdentity.objects.create(
            device_token_hash=new_token_hash,
            guest_id=guest_id,
            user=guest_user,
            ai_operations_allowed=1,
            ai_operations_used=0,
            is_active=True,
            initial_ip=client_ip,
            last_ip=client_ip,
            user_agent=user_agent
        )

    if response:
        attach_guest_cookie(response, new_raw_token)

    return identity, new_raw_token, True


def resolve_guest_identity_from_request(request: HttpRequest) -> Optional[GuestDeviceIdentity]:
    """
    Safely resolves the current request's active GuestDeviceIdentity without
    creating a new one if absent.
    """
    raw_token = extract_raw_device_token(request)
    if not raw_token:
        return None

    token_hash = hash_device_token(raw_token)
    return (
        GuestDeviceIdentity.objects
        .select_related("user", "user__ai_quota")
        .filter(device_token_hash=token_hash, is_active=True)
        .first()
    )


def link_guest_device_to_account(request: HttpRequest, registered_user: User) -> Optional[GuestDeviceIdentity]:
    """
    Links the active guest device profile to a newly authenticated Google account.
    Ensures the device's prior guest usage is preserved and cannot be exploited
    by repeatedly signing in/out.
    """
    identity = resolve_guest_identity_from_request(request)
    if identity and not identity.linked_user:
        identity.linked_user = registered_user
        identity.save(update_fields=["linked_user"])
        logger.info(f"Linked guest device {identity.guest_id} to registered user {registered_user.email}")
    return identity

