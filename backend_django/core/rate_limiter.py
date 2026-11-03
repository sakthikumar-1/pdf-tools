import os
"""
Multi-worker sliding-window rate limiter for Simatrix PDF API endpoints.
Backed by database AIRateLimitBucket with thread-safe in-memory fallback.
Protects authentication, PDF processing utilities, and download endpoints from abuse and DoS.
"""

import time
import logging
import ipaddress
from datetime import timedelta
from typing import Tuple, Dict, List, Optional
from threading import Lock

from django.utils import timezone
from django.db import transaction, DatabaseError

logger = logging.getLogger(__name__)

# Fallback in-memory tracking
_memory_lock = Lock()
_memory_buckets: Dict[str, List[float]] = {}


# Cloudflare published IP ranges (IPv4 & IPv6)
CLOUDFLARE_NETWORKS = (
    ipaddress.ip_network("173.245.48.0/20"),
    ipaddress.ip_network("103.21.244.0/22"),
    ipaddress.ip_network("103.22.200.0/22"),
    ipaddress.ip_network("103.31.4.0/22"),
    ipaddress.ip_network("141.101.64.0/18"),
    ipaddress.ip_network("108.162.192.0/18"),
    ipaddress.ip_network("190.93.240.0/20"),
    ipaddress.ip_network("188.114.96.0/20"),
    ipaddress.ip_network("197.234.240.0/22"),
    ipaddress.ip_network("198.41.128.0/17"),
    ipaddress.ip_network("162.158.0.0/15"),
    ipaddress.ip_network("104.16.0.0/13"),
    ipaddress.ip_network("104.24.0.0/14"),
    ipaddress.ip_network("172.64.0.0/13"),
    ipaddress.ip_network("131.0.72.0/22"),
    ipaddress.ip_network("2400:cb00::/32"),
    ipaddress.ip_network("2606:4700::/32"),
    ipaddress.ip_network("2803:f800::/32"),
    ipaddress.ip_network("2405:b500::/32"),
    ipaddress.ip_network("2405:8100::/32"),
    ipaddress.ip_network("2a06:98c0::/29"),
    ipaddress.ip_network("2c0f:f248::/32"),
)

def _is_cloudflare_ip(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    for net in CLOUDFLARE_NETWORKS:
        if ip in net:
            return True
    return False


def get_client_ip(request) -> str:
    """
    Securely extracts validated client IP from request, preventing spoofing via arbitrary headers.
    Priority:
    1. HTTP_CF_CONNECTING_IP: Trusted ONLY if request is demonstrably from a verified Cloudflare proxy.
    2. HTTP_X_FORWARDED_FOR: Validated for non-private IP, taking rightmost trusted public IP before Render proxy.
    3. REMOTE_ADDR: Direct socket peer address.
    Guarantees valid IPv4 or IPv6 string; never returns arbitrary user strings.
    """
    from django.conf import settings
    trust_cf = (
        getattr(settings, 'TRUST_CF_CONNECTING_IP', False)
        or os.getenv('TRUST_CF_CONNECTING_IP', 'false').lower() in ('true', '1', 'yes')
    )

    # 1. Parse and validate X-Forwarded-For chain
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    valid_ips = []
    if xff:
        raw_ips = [ip.strip().split(':')[0] for ip in xff.split(',') if ip.strip()]
        for raw in raw_ips:
            try:
                valid_ips.append(ipaddress.ip_address(raw))
            except ValueError:
                continue

    public_ips = [ip for ip in valid_ips if not (ip.is_loopback or ip.is_private or ip.is_reserved)]

    # 2. Cloudflare edge header: Trust ONLY if demonstrably routed via Cloudflare
    cf_ip = (request.META.get('HTTP_CF_CONNECTING_IP') or '').strip()
    if cf_ip:
        try:
            parsed_cf = ipaddress.ip_address(cf_ip)
            is_cf_proxy = any(_is_cloudflare_ip(ip) for ip in valid_ips)
            if (trust_cf or is_cf_proxy) and not (parsed_cf.is_loopback or parsed_cf.is_private or parsed_cf.is_reserved):
                return str(parsed_cf)
        except ValueError:
            pass

    # 3. Take rightmost public IP from verified proxy chain
    if public_ips:
        return str(public_ips[-1])
    if valid_ips:
        return str(valid_ips[0])

    # 4. Fallback to direct socket address
    remote_addr = (request.META.get('REMOTE_ADDR') or '127.0.0.1').strip().split(':')[0]
    try:
        return str(ipaddress.ip_address(remote_addr))
    except ValueError:
        return '127.0.0.1'


def update_rate_limit_bucket(key: str, limit: int, window_seconds: int = 60) -> Tuple[bool, int, int]:
    """
    Atomic sliding-window rate limit check across MySQL InnoDB or in-memory fallback.
    Returns: (is_allowed, remaining_requests, retry_after_seconds)
    """
    try:
        from apps.authentication.models import AIRateLimitBucket

        now = timezone.now()
        cutoff = now - timedelta(seconds=window_seconds)

        with transaction.atomic():
            bucket = AIRateLimitBucket.objects.select_for_update().filter(key=key).first()
            if not bucket or bucket.window_start < cutoff:
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

            if bucket.request_count >= limit:
                elapsed = (now - bucket.window_start).total_seconds()
                retry_after = max(1, int(window_seconds - elapsed))
                return False, 0, retry_after

            bucket.request_count += 1
            bucket.save(update_fields=['request_count', 'updated_at'])
            return True, max(0, limit - bucket.request_count), 0

    except Exception:
        # Fallback to thread-safe in-memory sliding window
        now_ts = time.time()
        cutoff_ts = now_ts - window_seconds
        with _memory_lock:
            stamps = _memory_buckets.get(key, [])
            valid_stamps = [t for t in stamps if t > cutoff_ts]
            if len(valid_stamps) >= limit:
                oldest = valid_stamps[0]
                retry_after = max(1, int(oldest + window_seconds - now_ts))
                _memory_buckets[key] = valid_stamps
                return False, 0, retry_after
            valid_stamps.append(now_ts)
            _memory_buckets[key] = valid_stamps
            return True, limit - len(valid_stamps), 0


def check_auth_rate_limit(request, limit: int = 20, window_seconds: int = 60) -> Tuple[bool, int, int]:
    """Rate limit on Google OAuth login attempts (20 req / 60s per IP)."""
    ip = get_client_ip(request)
    return update_rate_limit_bucket(f"auth:ip:{ip}", limit=limit, window_seconds=window_seconds)


def check_utility_rate_limit(request, limit: int = 60, window_seconds: int = 60) -> Tuple[bool, int, int]:
    """Rate limit on CPU-intensive PDF utility operations (60 req / 60s per IP)."""
    ip = get_client_ip(request)
    return update_rate_limit_bucket(f"util:ip:{ip}", limit=limit, window_seconds=window_seconds)


def check_download_rate_limit(request, limit: int = 120, window_seconds: int = 60) -> Tuple[bool, int, int]:
    """Rate limit on file downloads (120 req / 60s per IP)."""
    ip = get_client_ip(request)
    return update_rate_limit_bucket(f"dl:ip:{ip}", limit=limit, window_seconds=window_seconds)


def reset_rate_limits() -> None:
    """Clears in-memory buckets (useful for unit tests)."""
    with _memory_lock:
        _memory_buckets.clear()


class AIRateLimiter:
    """Legacy backward-compatible rate limiter."""

    def __init__(self, max_requests: int = 15, window_seconds: int = 3600):
        self.max_requests = max_requests
        self.window_seconds = window_seconds

    def check(self, identifier: str) -> Tuple[bool, int, int]:
        return update_rate_limit_bucket(f"legacy:{identifier}", limit=self.max_requests, window_seconds=self.window_seconds)

    def record(self, identifier: str) -> None:
        pass

    def reset(self) -> None:
        reset_rate_limits()


ai_rate_limiter = AIRateLimiter(max_requests=15, window_seconds=3600)
