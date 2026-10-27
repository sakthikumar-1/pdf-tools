"""
WSGI entrypoint for Render and cloud web hosts.
Provides 'app' and 'application' callables so standard start commands like:
  - gunicorn app:app
  - gunicorn app:application
work automatically out-of-the-box.
"""
import os
import sys
from pathlib import Path

# Add backend_django to python path so Django apps, settings, and engines import seamlessly
ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend_django"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Use production settings on Render, or default to core.settings
if os.environ.get("RENDER") or os.environ.get("DJANGO_SETTINGS_MODULE"):
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", os.environ.get("DJANGO_SETTINGS_MODULE", "core.settings.production"))
else:
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")

from django.core.wsgi import get_wsgi_application

application = get_wsgi_application()
app = application
