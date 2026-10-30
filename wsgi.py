"""
Root WSGI config for Simatrix PDF Tools.
Delegates seamlessly to backend_django/core/wsgi.py.
"""
import os
import sys
from pathlib import Path

root_dir = Path(__file__).resolve().parent
backend_dir = root_dir / 'backend_django'
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

from core.wsgi import application  # noqa: F401
