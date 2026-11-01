"""
Management command to clean up expired files in private storage directories,
purge expired Ask PDF chat sessions (and extracted document chunks),
and invalidate stale quota reservations.

Usage:
    python manage.py cleanup_storage [--max-age 900]
"""

import time
import logging
from pathlib import Path
from django.core.management.base import BaseCommand
from django.conf import settings
from django.utils import timezone

from apps.authentication.models import AIChatSession, AIQuotaReservation

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Removes temporary upload and output files older than a specified duration, and purges expired AI chat sessions/chunks."

    def add_arguments(self, parser):
        parser.add_argument(
            '--max-age',
            type=int,
            default=900,  # 15 minutes
            help="Maximum age of files in seconds before they are purged (default: 900)."
        )

    def handle(self, *args, **options):
        max_age = options['max_age']
        now_ts = time.time()
        now_dt = timezone.now()
        total_deleted = 0
        total_bytes = 0

        # 1. Purge expired temporary files in storage directories
        target_dirs = [settings.UPLOADS_DIR, settings.OUTPUTS_DIR, settings.PROCESSING_DIR]

        for target_dir in target_dirs:
            if not target_dir.exists():
                continue

            for item in target_dir.iterdir():
                if item.is_file() and not item.name.startswith('.'):
                    try:
                        file_age = now_ts - item.stat().st_mtime
                        if file_age > max_age:
                            file_size = item.stat().st_size
                            item.unlink(missing_ok=True)
                            total_deleted += 1
                            total_bytes += file_size
                    except Exception as exc:
                        self.stderr.write(f"Error deleting {item}: {exc}")

        mb_freed = total_bytes / (1024 * 1024)

        # 2. Purge expired Ask PDF conversational sessions (24h TTL)
        # Cascading foreign keys automatically purge all related AIChatMessage rows and chunks_data JSON
        sessions_deleted = 0
        try:
            expired_sessions = AIChatSession.objects.filter(expires_at__lt=now_dt)
            sessions_deleted = expired_sessions.count()
            if sessions_deleted > 0:
                expired_sessions.delete()
        except Exception as exc:
            logger.warning(f"Could not purge expired chat sessions: {exc}")

        # 3. Transition stale unconfirmed AI reservations
        stale_reservations = 0
        try:
            stale_reservations = AIQuotaReservation.objects.filter(
                status='RESERVED',
                expires_at__lt=now_dt
            ).update(status='EXPIRED')
        except Exception as exc:
            logger.warning(f"Could not expire stale reservations: {exc}")

        self.stdout.write(
            self.style.SUCCESS(
                f"Cleanup complete: Purged {total_deleted} expired file(s) ({mb_freed:.2f} MB freed), "
                f"deleted {sessions_deleted} expired Ask PDF session(s)/chunk context, "
                f"expired {stale_reservations} stale quota reservation(s)."
            )
        )
