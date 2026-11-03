"""
Simatrix PDF — HTTP Security Headers Middleware (Phase 6: SEC-09).
Enforces Content-Security-Policy (CSP), Permissions-Policy, Referrer-Policy,
anti-clickjacking, and MIME sniffing protection across all HTTP responses.
"""

from django.utils.deprecation import MiddlewareMixin

CSP_POLICY = (
    "default-src 'self'; "
    "script-src 'self' https://accounts.google.com/gsi/client; "
    "style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style https://fonts.googleapis.com; "
    "frame-src 'self' https://accounts.google.com/; "
    "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com; "
    "img-src 'self' data: blob: https://lh3.googleusercontent.com; "
    "worker-src 'self' blob:; "
    "font-src 'self' data: https://fonts.gstatic.com; "
    "object-src 'none'; "
    "base-uri 'self'; "
    "form-action 'self';"
)

PERMISSIONS_POLICY = "camera=(), microphone=(), geolocation=(), payment=()"


class SecurityHeadersMiddleware(MiddlewareMixin):
    """
    Attaches security headers to every outgoing HTTP response:
    - Content-Security-Policy (CSP)
    - Permissions-Policy
    - Referrer-Policy
    - X-Content-Type-Options
    - X-Frame-Options
    """

    def process_response(self, request, response):
        # 1. Content-Security-Policy
        if "Content-Security-Policy" not in response:
            response["Content-Security-Policy"] = CSP_POLICY

        # 2. Permissions-Policy
        if "Permissions-Policy" not in response:
            response["Permissions-Policy"] = PERMISSIONS_POLICY

        # 3. Referrer-Policy
        if "Referrer-Policy" not in response:
            response["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # 4. Anti-MIME sniffing
        if "X-Content-Type-Options" not in response:
            response["X-Content-Type-Options"] = "nosniff"

        # 5. Anti-clickjacking (deny unless overridden)
        if "X-Frame-Options" not in response:
            response["X-Frame-Options"] = "DENY"

        return response

