"""
Production Settings for Simatrix Academy PDF Tools.
Configured for Linux VPS deployment with Nginx, Gunicorn/Uvicorn, and MySQL.
"""

import os
from .base import *

# Explicitly disable debug in production
DEBUG = False

# Allowed hosts from environment or default to permissive on Render
raw_allowed = os.getenv('DJANGO_ALLOWED_HOSTS', '').strip()
if raw_allowed:
    ALLOWED_HOSTS = [host.strip() for host in raw_allowed.split(',') if host.strip()]
else:
    ALLOWED_HOSTS = ['*']

# Always ensure Render domain and local probe addresses are included
RENDER_EXTERNAL_HOSTNAME = os.environ.get('RENDER_EXTERNAL_HOSTNAME')
for host in [
    RENDER_EXTERNAL_HOSTNAME,
    '.onrender.com',
    'pdf-tools-2-g8im.onrender.com',
    'pdf-tools-4-idi2.onrender.com',
    '127.0.0.1',
    'localhost',
    '0.0.0.0',
]:
    if host and host not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(host)

# CSRF Trusted Origins for Render and custom domains
CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in os.getenv('CSRF_TRUSTED_ORIGINS', '').split(',')
    if origin.strip()
]
if RENDER_EXTERNAL_HOSTNAME:
    CSRF_TRUSTED_ORIGINS.append(f'https://{RENDER_EXTERNAL_HOSTNAME}')
for origin in [
    'https://*.onrender.com',
    'https://pdf-tools-2-g8im.onrender.com',
    'https://pdf-tools-4-idi2.onrender.com',
    'http://127.0.0.1:10000',
    'http://localhost:10000',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
]:
    if origin not in CSRF_TRUSTED_ORIGINS:
        CSRF_TRUSTED_ORIGINS.append(origin)

# Whitenoise Static Files Middleware & Storage for production
try:
    import whitenoise
    if 'whitenoise.middleware.WhiteNoiseMiddleware' not in MIDDLEWARE:
        sec_idx = MIDDLEWARE.index('django.middleware.security.SecurityMiddleware')
        MIDDLEWARE.insert(sec_idx + 1, 'whitenoise.middleware.WhiteNoiseMiddleware')
except (ImportError, ValueError):
    pass

FRONTEND_DIST = BASE_DIR.parent / 'frontend' / 'dist'
if FRONTEND_DIST.exists():
    WHITENOISE_ROOT = str(FRONTEND_DIST)
    WHITENOISE_INDEX_FILE = True
    WHITENOISE_AUTOREFRESH = False
    WHITENOISE_MAX_AGE = 31536000

STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Tell Django that Render reverse proxy terminates SSL and forwards X-Forwarded-Proto
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# On Render, SSL is handled at the cloud router/CDN level.
# Internal container port scans (like Render's Go-http-client on 127.0.0.1) connect over HTTP.
# Default SECURE_SSL_REDIRECT to False inside container to avoid 301 on internal health checks.
SECURE_SSL_REDIRECT = os.getenv('DJANGO_SECURE_SSL_REDIRECT', 'False').lower() in ('true', '1', 'yes')
SECURE_REDIRECT_EXEMPT = [r'^api/v1/health', r'^$']

SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_HSTS_SECONDS = int(os.getenv('DJANGO_HSTS_SECONDS', '31536000'))  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Production Logging Configuration
LOG_DIR = BASE_DIR / 'logs'
LOG_DIR.mkdir(parents=True, exist_ok=True)

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{asctime}] {levelname} {name} {process:d} {thread:d}: {message}',
            'style': '{',
        },
        'simple': {
            'format': '[{asctime}] {levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
        'file': {
            'level': 'WARNING',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': LOG_DIR / 'django_errors.log',
            'maxBytes': 10 * 1024 * 1024,  # 10 MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': os.getenv('DJANGO_LOG_LEVEL', 'INFO'),
            'propagate': False,
        },
        'engines': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
