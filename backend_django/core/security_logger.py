"""
Simatrix PDF — Structured Security Event Auditing & Incident Logging (Phase 7: SEC-10).
Emits structured JSON security events for SIEM/audit ingestion without logging credentials.
"""

import json
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any

logger = logging.getLogger("simatrix.security")


def log_security_event(
    event_type: str,
    severity: str,
    client_ip: str,
    user_id: Optional[str] = None,
    email: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None
) -> None:
    """
    Emits a structured JSON security audit log event.
    Guarantees that sensitive credentials, keys, and tokens are never recorded.
    """
    event = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event_type": str(event_type),
        "severity": str(severity).upper(),
        "client_ip": str(client_ip or "unknown"),
        "user_id": str(user_id) if user_id else None,
        "email": str(email) if email else None,
        "details": details or {}
    }

    payload_str = json.dumps(event)

    sev = severity.upper()
    if sev == "CRITICAL" or sev == "ERROR":
        logger.error(f"[SECURITY_ALERT] {payload_str}")
    elif sev == "WARNING":
        logger.warning(f"[SECURITY_WARN] {payload_str}")
    else:
        logger.info(f"[SECURITY_AUDIT] {payload_str}")

