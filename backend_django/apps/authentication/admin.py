from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    User,
    AIUserQuota,
    AIQuotaReservation,
    AIUsageLog,
    AIChatSession,
    AIChatMessage,
    AIRateLimitBucket
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('email', 'username', 'full_name', 'role', 'is_verified', 'is_staff', 'created_at')
    list_filter = ('role', 'is_verified', 'is_staff', 'is_superuser', 'is_active')
    search_fields = ('email', 'username', 'full_name')
    ordering = ('-created_at',)
    readonly_fields = ('id', 'created_at', 'updated_at')

    fieldsets = (
        (None, {'fields': ('id', 'email', 'password')}),
        ('Personal Info', {'fields': ('username', 'full_name', 'avatar_url')}),
        ('Permissions & Roles', {'fields': ('role', 'is_verified', 'is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined', 'created_at', 'updated_at')}),
    )


@admin.register(AIUserQuota)
class AIUserQuotaAdmin(admin.ModelAdmin):
    list_display = ('user_email', 'used_count', 'total_allowed', 'remaining_display', 'is_blocked', 'consent_given_at', 'updated_at')
    list_filter = ('is_blocked', 'total_allowed')
    search_fields = ('user__email', 'user__full_name')
    readonly_fields = ('id', 'created_at', 'updated_at')
    actions = ['reset_quota', 'grant_five_requests', 'unblock_users', 'block_users']

    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'User Email'

    def remaining_display(self, obj):
        return max(0, obj.total_allowed - obj.used_count)
    remaining_display.short_description = 'Remaining'

    @admin.action(description="Reset selected quotas to 0 used")
    def reset_quota(self, request, queryset):
        count = queryset.update(used_count=0)
        self.message_user(request, f"Successfully reset {count} user quota(s) to 0 used.")

    @admin.action(description="Grant +5 additional requests to selected users")
    def grant_five_requests(self, request, queryset):
        for quota in queryset:
            quota.total_allowed += 5
            quota.save(update_fields=['total_allowed', 'updated_at'])
        self.message_user(request, f"Successfully granted +5 requests to {queryset.count()} user(s).")

    @admin.action(description="Unblock selected user quotas")
    def unblock_users(self, request, queryset):
        count = queryset.update(is_blocked=False)
        self.message_user(request, f"Unblocked {count} user(s).")

    @admin.action(description="Block selected user quotas")
    def block_users(self, request, queryset):
        count = queryset.update(is_blocked=True)
        self.message_user(request, f"Blocked {count} user(s).")


@admin.register(AIQuotaReservation)
class AIQuotaReservationAdmin(admin.ModelAdmin):
    list_display = ('id', 'user_email', 'tool_type', 'status', 'expires_at', 'created_at')
    list_filter = ('status', 'tool_type')
    search_fields = ('user__email', 'idempotency_key')
    readonly_fields = ('id', 'created_at', 'settled_at')

    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'User Email'


@admin.register(AIUsageLog)
class AIUsageLogAdmin(admin.ModelAdmin):
    list_display = ('user_email', 'tool_type', 'provider_used', 'model_used', 'total_tokens', 'execution_time_ms', 'success', 'created_at')
    list_filter = ('provider_used', 'success', 'tool_type')
    search_fields = ('user__email', 'ip_address')
    readonly_fields = ('id', 'created_at')

    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'User Email'


@admin.register(AIChatSession)
class AIChatSessionAdmin(admin.ModelAdmin):
    list_display = ('id', 'user_email', 'document_name', 'page_count', 'is_active', 'expires_at', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('user__email', 'document_name', 'document_sha256')
    readonly_fields = ('id', 'created_at', 'updated_at')

    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'User Email'


@admin.register(AIChatMessage)
class AIChatMessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'session_id', 'role', 'created_at')
    list_filter = ('role',)
    search_fields = ('session__id', 'content')
    readonly_fields = ('id', 'created_at')


@admin.register(AIRateLimitBucket)
class AIRateLimitBucketAdmin(admin.ModelAdmin):
    list_display = ('key', 'request_count', 'window_start', 'updated_at')
    search_fields = ('key',)
    readonly_fields = ('updated_at',)
