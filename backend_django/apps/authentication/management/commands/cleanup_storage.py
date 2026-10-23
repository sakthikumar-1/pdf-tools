"""
Management command to clean up expired files in private storage directories.
Usage:
    python manage.py cleanup_storage [--max-age 900]
"""

import time
import logging
from pathlib import Path
from django.core.management.base import BaseCommand
from django.conf import settings

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Removes temporary upload and output files older than a specified duration."

    def add_arguments(self, parser):
        parser.add_argument(
            '--max-age',
            type=int,
            default=900,  # 15 minutes
            help="Maximum age of files in seconds before they are purged (default: 900)."
        )

    def handle(self, *args, **options):
        max_age = options['max_age']
        now = time.time()
        total_deleted = 0
        total_bytes = 0

        target_dirs = [settings.UPLOADS_DIR, settings.OUTPUTS_DIR, settings.PROCESSING_DIR]

        for target_dir in target_dirs:
            if not target_dir.exists():
                continue

            for item in target_dir.iterdir():
                if item.is_file() and not item.name.startswith('.'):
                    try:
                        file_age = now - item.stat().st_mtime
                        if file_age > max_age:
                            file_size = item.stat().st_size
                            item.unlink(missing_ok=True)
                            total_deleted += 1
                            total_bytes += file_size
                    except Exception as exc:
                        self.stderr.write(f"Error deleting {item}: {exc}")

        mb_freed = total_bytes / (1024 * 1024)
        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully purged {total_deleted} expired file(s) ({mb_freed:.2f} MB freed)."
            )
        )
