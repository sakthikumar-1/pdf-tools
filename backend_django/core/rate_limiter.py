"""
Lightweight in-memory sliding window rate limiter for anonymous AI Summarizer requests.
Protects AI endpoints against denial of service and upstream API quota depletion.
"""

import time
from typing import Tuple, Dict, List
from threading import Lock


class AIRateLimiter:
    """
    Thread-safe sliding-window rate limiter for AI operations.
    Defaults to 15 requests per 3600 seconds (1 hour) per client identifier (IP or session).
    """

    def __init__(self, max_requests: int = 15, window_seconds: int = 3600):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._history: Dict[str, List[float]] = {}
        self._lock = Lock()

    def check(self, identifier: str) -> Tuple[bool, int, int]:
        """
        Checks whether client is allowed to make an AI request.
        Returns: (is_allowed, remaining_requests, retry_after_seconds)
        """
        now = time.time()
        window_start = now - self.window_seconds

        with self._lock:
            timestamps = self._history.get(identifier, [])
            # Filter out entries outside the sliding window
            valid_timestamps = [t for t in timestamps if t > window_start]
            self._history[identifier] = valid_timestamps

            count = len(valid_timestamps)
            if count >= self.max_requests:
                oldest_in_window = valid_timestamps[0]
                retry_after = max(1, int(oldest_in_window + self.window_seconds - now))
                return False, 0, retry_after

            remaining = self.max_requests - count
            return True, remaining, 0

    def record(self, identifier: str) -> None:
        """Records a successful request timestamp for the client identifier."""
        now = time.time()
        with self._lock:
            if identifier not in self._history:
                self._history[identifier] = []
            self._history[identifier].append(now)

    def reset(self) -> None:
        """Clears all tracking history (useful for testing)."""
        with self._lock:
            self._history.clear()


# Global AI Rate Limiter instance (15 requests per hour)
ai_rate_limiter = AIRateLimiter(max_requests=15, window_seconds=3600)


def get_client_ip(request) -> str:
    """Extracts client IP from Django request, respecting X-Forwarded-For headers."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR', '127.0.0.1')
    return ip or '127.0.0.1'
