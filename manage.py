#!/usr/bin/env python
"""
Root Django management wrapper for Simatrix PDF Tools.
Delegates to backend_django/ with core.settings and defaults runserver to 127.0.0.1:8001.
"""
import os
import sys
from pathlib import Path


def main():
    root_dir = Path(__file__).resolve().parent
    backend_dir = root_dir / 'backend_django'
    sys.path.insert(0, str(backend_dir))
    os.chdir(str(backend_dir))
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

    # If runserver is invoked without an explicit address/port, default to 127.0.0.1:8001
    # to match the Vite development proxy configuration (frontend/vite.config.js).
    if len(sys.argv) > 1 and sys.argv[1] == 'runserver' and len(sys.argv) == 2:
        sys.argv.append('127.0.0.1:8001')

    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
