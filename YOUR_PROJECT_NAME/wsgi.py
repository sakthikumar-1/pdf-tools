"""
WSGI config for Render deployment when the default placeholder YOUR_PROJECT_NAME is invoked.
Delegates seamlessly to backend_django/core/wsgi.py.
"""
import os
import sys
from pathlib import Path

# Add backend_django to sys.path
root_dir = Path(__file__).resolve().parent.parent
backend_dir = root_dir / 'backend_django'
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

from core.wsgi import application  # noqa: F401

