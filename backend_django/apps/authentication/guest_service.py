"""
Simatrix PDF - Guest Service (Decommissioned).
Guest identities and anonymous AI access have been completely removed.
This module is retained strictly for backwards compatibility with any legacy imports.
"""

import hashlib
import logging
from typing import Tuple, Optional

from django.http import HttpRequest, HttpResponse
from apps.authentication.models import User, GuestDeviceIdentity

logger = logging.getLogger(__name__)

GUEST_DEVICE_COOKIE_NAME = "simatrix_device_token"
GUEST_COOKIE_MAX_AGE = 0


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
    """Computes a cryptographic SHA-256 hash of a device token."""
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
    """Inert stub: guest creation is removed."""
    return False, "Guest registration is no longer supported. Please sign in with Google."


def extract_raw_device_token(request: HttpRequest) -> Optional[str]:
    """Inert stub: tokens are no longer extracted."""
    return None


def attach_guest_cookie(response: HttpResponse, raw_token: str) -> None:
    """Inert stub: guest cookies are no longer attached; deletes cookie if present."""
    if response:
        response.delete_cookie(GUEST_DEVICE_COOKIE_NAME, path="/")


def get_or_create_guest_identity(
    request: HttpRequest,
    response: Optional[HttpResponse] = None
) -> Tuple[GuestDeviceIdentity, str, bool]:
    """Inert stub: guest access removed."""
    if response:
        response.delete_cookie(GUEST_DEVICE_COOKIE_NAME, path="/")
    raise GuestIdentityException("Guest access has been removed. Please sign in with Google to use Simatrix AI.")


def resolve_guest_identity_from_request(request: HttpRequest) -> Optional[GuestDeviceIdentity]:
    """Inert stub: guest identity resolution returns None."""
    return None


def link_guest_device_to_account(request: HttpRequest, user: User) -> bool:
    """Inert stub: no guest device linking."""
    return False


def revoke_guest_identity(guest_id: str) -> bool:
    """Revokes a legacy guest device profile."""
    updated = GuestDeviceIdentity.objects.filter(guest_id=guest_id).update(is_active=False)
    return updated > 0
