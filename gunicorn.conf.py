"""
Gunicorn Configuration for Render and High-Concurrency Production Deployments.
Optimized for low-latency streaming, parallel asset downloads, and multi-threaded throughput.
"""
import multiprocessing
import os

# Port binding
port = os.environ.get("PORT", "10000")
bind = f"0.0.0.0:{port}"

# Concurrency: Use threaded workers to handle concurrent static asset streaming and API requests
# 2 workers x 4 threads = 8 concurrent request slots, preventing queue head-of-line blocking
workers = int(os.environ.get("WEB_CONCURRENCY", 2))
threads = int(os.environ.get("GUNICORN_THREADS", 4))
worker_class = "gthread"

# HTTP Keep-Alive allows browsers to reuse TCP/TLS connections for multiple assets
keepalive = 65

# Worker timeouts & memory management
timeout = 120
graceful_timeout = 30
max_requests = 1000
max_requests_jitter = 50

# Logging
accesslog = "-"
errorlog = "-"
loglevel = os.environ.get("GUNICORN_LOG_LEVEL", "info")
