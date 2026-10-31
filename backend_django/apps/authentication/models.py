import re
import uuid
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings


class UserManager(BaseUserManager):
    """Custom user manager where email is the unique identifier for auth."""

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('An email address is required.')
        email = self.normalize_email(email)
        extra_fields.setdefault('username', email.split('@')[0])
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('role', 'admin')
        extra_fields.setdefault('is_verified', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    """
    Simatrix Academy Custom User Model.
    Configured prior to initial database migration to prevent schema lock-in.
    Uses UUID primary keys and email-based authentication.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, db_index=True, max_length=255)
    full_name = models.CharField(max_length=150, blank=True, default='')
    avatar_url = models.URLField(max_length=500, blank=True, null=True)
    is_verified = models.BooleanField(default=False)
    role = models.CharField(
        max_length=20,
        default='user',
        choices=[('user', 'User'), ('admin', 'Admin')]
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.email} ({self.role})"


# ==============================================================================
# AI QUOTA & RESERVATION MODELS (MySQL 8.0 InnoDB)
# ==============================================================================

class AIUserQuota(models.Model):
    """
    Account-level AI usage quota backed by MySQL InnoDB row-level locking.
    Guarantees strict 5-request cap across all AI tools.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='ai_quota'
    )
    total_allowed = models.PositiveIntegerField(default=5)
    used_count = models.PositiveIntegerField(default=0)
    is_blocked = models.BooleanField(default=False)
    consent_given_at = models.DateTimeField(null=True, blank=True)
    consent_policy_version = models.CharField(max_length=20, default='', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ai_user_quotas'
        verbose_name = 'AI User Quota'
        verbose_name_plural = 'AI User Quotas'

    def __str__(self):
        return f"{self.user.email} - {self.used_count}/{self.total_allowed} used"


class AIQuotaReservation(models.Model):
    """
    In-flight quota reservation slot.
    Uses MySQL database-level unique constraint on (user_id, idempotency_key)
    and InnoDB row-level locking to prevent concurrent race conditions.
    """
    STATUS_CHOICES = [
        ('RESERVED', 'Reserved'),
        ('CONSUMED', 'Consumed'),
        ('RELEASED', 'Released'),
        ('EXPIRED', 'Expired'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='ai_reservations',
        db_index=True
    )
    idempotency_key = models.CharField(max_length=128)
    tool_type = models.CharField(max_length=50)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='RESERVED', db_index=True)
    expires_at = models.DateTimeField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    settled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'ai_quota_reservations'
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'idempotency_key'],
                name='unique_user_idempotency_key'
            )
        ]
        indexes = [
            models.Index(fields=['user', 'status', 'expires_at'], name='idx_res_user_status_exp'),
        ]

    def __str__(self):
        return f"Reservation {self.id} ({self.status}) for {self.user.email}"


class AIUsageLog(models.Model):
    """
    Sanitized audit log recording token counts, provider telemetry, latency, and costs.
    Stored in MySQL InnoDB table with zero credential leakage.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='ai_usage_logs',
        db_index=True
    )
    reservation = models.ForeignKey(
        AIQuotaReservation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='usage_logs'
    )
    tool_type = models.CharField(max_length=50)
    provider_used = models.CharField(max_length=30)  # 'deepseek', 'gemini', 'mock'
    model_used = models.CharField(max_length=50)
    prompt_tokens = models.PositiveIntegerField(default=0)
    completion_tokens = models.PositiveIntegerField(default=0)
    total_tokens = models.PositiveIntegerField(default=0)
    estimated_cost_usd = models.DecimalField(max_digits=10, decimal_places=6, default=0.0)
    execution_time_ms = models.PositiveIntegerField(default=0)
    fallback_occurred = models.BooleanField(default=False)
    success = models.BooleanField(default=True)
    error_message = models.TextField(blank=True, default='')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_usage_logs'
        ordering = ['-created_at']

    @staticmethod
    def sanitize_error_message(msg: str) -> str:
        """
        Strips API keys, passwords, bearer tokens, or sensitive payload dumps
        from logged error messages.
        """
        if not msg:
            return ''
        # Strip DeepSeek or OpenAI keys
        sanitized = re.sub(r'sk-[a-zA-Z0-9_\-]{20,}', '[REDACTED_API_KEY]', msg)
        # Strip Google Gemini keys
        sanitized = re.sub(r'AIza[a-zA-Z0-9_\-]{30,}', '[REDACTED_API_KEY]', sanitized)
        # Strip Bearer tokens
        sanitized = re.sub(r'Bearer\s+[a-zA-Z0-9_\-\.:=]+', 'Bearer [REDACTED_TOKEN]', sanitized, flags=re.IGNORECASE)
        # Strip passwords
        sanitized = re.sub(r'(password|secret)=["\']?[^\s"\'&]+', r'\1=[REDACTED]', sanitized, flags=re.IGNORECASE)
        # Truncate length
        return sanitized[:500]


@receiver(post_save, sender=User)
def auto_create_user_quota(sender, instance, created, **kwargs):
    """
    Ensures every newly created User automatically has an AIUserQuota row
    initialized, preventing race conditions on first AI request.
    """
    if created:
        AIUserQuota.objects.get_or_create(
            user=instance,
            defaults={'total_allowed': 5, 'used_count': 0, 'is_blocked': False}
        )


# ==============================================================================
# ASK PDF SESSION & MULTI-WORKER RATE LIMITING MODELS
# ==============================================================================

class AIChatSession(models.Model):
    """
    Ask PDF conversational session tied to an authenticated user and document.
    Chunks are persisted with a 24-hour TTL for multi-turn BM25 retrieval without
    storing raw PDF binary indefinitely.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='ai_chat_sessions',
        db_index=True
    )
    document_name = models.CharField(max_length=255, default='document.pdf')
    document_sha256 = models.CharField(max_length=64, db_index=True)
    page_count = models.PositiveIntegerField(default=1)
    chunks_data = models.JSONField(default=list)
    expires_at = models.DateTimeField(db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ai_chat_sessions'
        verbose_name = 'AI Chat Session'
        verbose_name_plural = 'AI Chat Sessions'
        indexes = [
            models.Index(fields=['user', 'is_active', 'expires_at'], name='idx_chat_user_act_exp'),
        ]

    def __str__(self):
        return f"ChatSession {self.id} ({self.document_name}) - {self.user.email}"


class AIChatMessage(models.Model):
    """
    Individual conversational turn inside an Ask PDF session.
    """
    ROLE_CHOICES = [
        ('user', 'User'),
        ('assistant', 'Assistant'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(
        AIChatSession,
        on_delete=models.CASCADE,
        related_name='messages',
        db_index=True
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    content = models.TextField()
    cited_pages = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_chat_messages'
        verbose_name = 'AI Chat Message'
        verbose_name_plural = 'AI Chat Messages'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['session', 'created_at'], name='idx_msg_sess_created'),
        ]

    def __str__(self):
        return f"Message {self.role} in {self.session_id}"


class AIRateLimitBucket(models.Model):
    """
    MySQL InnoDB-backed rate limit bucket shared across multiple application workers.
    Enforces per-user (10 req/min) and per-IP (30 req/min) sliding-window limits.
    """
    key = models.CharField(max_length=150, unique=True, db_index=True)
    request_count = models.PositiveIntegerField(default=1)
    window_start = models.DateTimeField(db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ai_rate_limit_buckets'
        verbose_name = 'AI Rate Limit Bucket'
        verbose_name_plural = 'AI Rate Limit Buckets'
        indexes = [
            models.Index(fields=['key', 'window_start'], name='idx_rl_key_win'),
        ]

    def __str__(self):
        return f"RateLimitBucket {self.key}: {self.request_count} reqs since {self.window_start}"

