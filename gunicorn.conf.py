"""
Gunicorn configuration for Simatrix PDF Tools on Render / production.
Automatically binds to $PORT (Render standard) with high-capacity timeout.
"""
import os

# Render injects the PORT environment variable (e.g. 10000)
port = os.environ.get("PORT", "8000")
bind = f"0.0.0.0:{port}"

# Concurrency & Performance
workers = int(os.environ.get("WEB_CONCURRENCY", "2"))
threads = 4
worker_class = "gthread"
timeout = 120
keepalive = 5

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"
