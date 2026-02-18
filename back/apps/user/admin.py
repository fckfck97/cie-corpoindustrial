from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    UserAccount,
    UserProfile,
    OneTimePassword,
    EnterpriseMonthlyPayment,
    EnterprisePaymentNotificationLog,
)
from unfold.forms import AdminPasswordChangeForm, UserChangeForm, UserCreationForm
from django.utils.translation import gettext_lazy as _
from unfold.admin import ModelAdmin


@admin.register(UserAccount)
class UserAccountAdmin(BaseUserAdmin, ModelAdmin):
    form = UserChangeForm
    add_form = UserCreationForm
    change_password_form = AdminPasswordChangeForm

    # Fields to be used in displaying the User model.
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (
            _("Personal info"),
            {"fields": ("username", "first_name", "last_name", "picture", "banner", "document_type", "nuip", "gender")},
        ),
        (
            _("Enterprise info"),
            {"fields": ("enterprise",)},
        ),
        (
            _("Permissions"),
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                    "role",
                )
            },
        ),
        (_("Important dates"), {"fields": ("last_login", "date_joined", "updated_at")}),
        (_("Account status"), {"fields": ("verified",)}),
    )

    # Fields to be used when creating a user.
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "username", "first_name", "last_name", "password1", "password2"),
            },
        ),
    )

    list_display = (
        "email",
        "username",
        "first_name",
        "last_name",
        "is_staff",
        "is_active",
        "role",
        "verified",
    )
    list_filter = ("is_staff", "is_active", "is_superuser", "role", "verified", "document_type", "gender")
    search_fields = ("email", "username", "first_name", "last_name", "nuip", "enterprise")
    readonly_fields = ("date_joined", "updated_at")
    ordering = ("-date_joined",)
    filter_horizontal = ("groups", "user_permissions")


@admin.register(UserProfile)
class UserProfileAdmin(ModelAdmin):
    list_display = ('user_email', 'document_type_enterprise', 'nuip_enterprise', 'monthly_fee', 'phone', 'address', 'facebook', 'instagram', 'X')
    search_fields = ('user__email', 'user__username', 'phone', 'address', 'facebook', 'instagram', 'X', 'nuip_enterprise')
    list_filter = ('document_type_enterprise',)
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        (_('User Information'), {
            'fields': ('user',)
        }),
        (_('Enterprise Documents'), {
            'fields': ('document_type_enterprise', 'nuip_enterprise', 'rut')
        }),
        (_('Contact Information'), {
            'fields': ('phone', 'address', 'description')
        }),
        (_('Social Media'), {
            'fields': ('facebook', 'instagram', 'X')
        }),
        (_('Payment Information'), {
            'fields': ('monthly_fee',)
        }),
        (_('Metadata'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'Email del Usuario'


@admin.register(OneTimePassword)
class OneTimePasswordAdmin(ModelAdmin):
    list_display = ("user", "code", "is_used", "created_at", "expires_at", "is_expired")
    search_fields = ("user__email", "code")
    list_filter = ("is_used", "created_at")
    readonly_fields = ("created_at", "expires_at", "is_expired")
    
    fieldsets = (
        (_('OTP Information'), {
            'fields': ('user', 'code', 'is_used')
        }),
        (_('Timestamps'), {
            'fields': ('created_at', 'expires_at'),
            'classes': ('collapse',)
        }),
    )
    
    def is_expired(self, obj):
        return obj.is_expired
    is_expired.boolean = True
    is_expired.short_description = _('Expired')


@admin.register(EnterpriseMonthlyPayment)
class EnterpriseMonthlyPaymentAdmin(ModelAdmin):
    list_display = (
        "enterprise",
        "year",
        "month",
        "amount",
        "paid_amount",
        "payment_method",
        "payment_reference",
        "status",
        "paid_reported_by",
        "paid_at",
    )
    list_filter = ("status", "year", "month", "payment_method")
    search_fields = ("enterprise__email", "enterprise__enterprise", "payment_reference")
    readonly_fields = ("created_at", "updated_at")
    
    fieldsets = (
        (_('Enterprise & Period'), {
            'fields': ('enterprise', 'year', 'month')
        }),
        (_('Payment Details'), {
            'fields': ('amount', 'paid_amount', 'due_date', 'grace_date', 'status')
        }),
        (_('Payment Information'), {
            'fields': ('payment_method', 'payment_reference', 'payment_proof', 'paid_reported_by', 'paid_at')
        }),
        (_('Additional Information'), {
            'fields': ('notes',)
        }),
        (_('Metadata'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(EnterprisePaymentNotificationLog)
class EnterprisePaymentNotificationLogAdmin(ModelAdmin):
    list_display = (
        "enterprise",
        "payment",
        "stage",
        "stage_label",
        "email_sent",
        "sms_sent",
        "sent_to_email",
        "sent_to_phone",
        "sent_at",
    )
    list_filter = ("stage", "email_sent", "sms_sent", "sent_at")
    search_fields = (
        "enterprise__email",
        "enterprise__enterprise",
        "sent_to_email",
        "sent_to_phone",
        "payment__id",
    )
    readonly_fields = ("sent_at",)
