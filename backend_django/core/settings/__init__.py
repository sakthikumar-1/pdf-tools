import os
from .base import *

# Automatically load production settings on Render or when explicitly requested
if os.environ.get('RENDER') == 'true' or os.environ.get('RENDER_EXTERNAL_HOSTNAME') or os.environ.get('DJANGO_SETTINGS_MODULE') == 'core.settings.production':
    try:
        from .production import *
    except ImportError:
        pass
