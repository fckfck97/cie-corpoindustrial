from django.db import models
from django.contrib.auth.models import (
    AbstractBaseUser,
    PermissionsMixin,
    BaseUserManager,
)
import uuid
from django.utils import timezone
from .utils.choices import DOCUMENT_TYPES,DOCUMENT_TYPES_ENTERPRISES ,GENDER_TYPES
from .utils.img import image_picture_directory_path,image_banner_directory_path,image_rut_directory_path
from django.db.models.signals import post_save
from django.dispatch import receiver
from datetime import timedelta
from decimal import Decimal


class UserAccountManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Users must have an email address")

        email = self.normalize_email(email)
        username = extra_fields.get("username")
        if not username:
            base_username = email.split("@")[0].strip() or "user"
            candidate = base_username
            suffix = 1
            while self.model.objects.filter(username=candidate).exists():
                suffix += 1
                candidate = f"{base_username}{suffix}"
            extra_fields["username"] = candidate
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)

        return user

    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("role", "Admin")
        extra_fields.setdefault("verified", True)
        extra_fields.setdefault("first_name", "Admin")
        extra_fields.setdefault("last_name", "User")

        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")

        user = self.create_user(email, password, **extra_fields)
        return user


class UserAccount(AbstractBaseUser, PermissionsMixin):
    roles = (
        ("employees", "Employees"),
        ("enterprise", "Enterprise"),
        ("Admin", "Admin"),
    )

    id =                models.UUIDField(default=uuid.uuid4, unique=True, primary_key=True)
    email =             models.EmailField(unique=True)
    username =          models.CharField(max_length=100, unique=True, blank=True)

    picture =           models.ImageField(
                        default="users/user_default_profile.png",
                        upload_to=image_picture_directory_path,
                        blank=True,
                        null=True,
                        verbose_name="Picture",
                        )
    banner =            models.ImageField(
                        default="users/user_default_bg.jpg",
                        upload_to=image_banner_directory_path,
                        blank=True,
                        null=True,
                        verbose_name="Banner",
                        )

    first_name =        models.CharField(max_length=30, blank=True, default="")
    last_name =         models.CharField(max_length=30, blank=True, default="")
    document_type =     models.CharField(max_length=2, choices=DOCUMENT_TYPES, default='CC', blank=True)
    nuip =              models.CharField(max_length=11, unique=True, blank=True, null=True)
    phone =             models.CharField(max_length=20, blank=True, null=True)
    enterprise =        models.CharField(max_length=100, blank=True, null=True)
    
    gender =            models.CharField(max_length=10, choices=GENDER_TYPES, null=True, blank=True)
    is_active =         models.BooleanField(default=True)
    is_staff =          models.BooleanField(default=False)

    role =              models.CharField(max_length=20, choices=roles, default="employees")
    verified =          models.BooleanField(default=False)

    date_joined =       models.DateTimeField(default=timezone.now)
    updated_at =        models.DateTimeField(auto_now=True)

    objects = UserAccountManager()
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    
    def __str__(self):
        return self.email

class UserProfile(models.Model):
    id =                        models.UUIDField(default=uuid.uuid4, unique=True, primary_key=True)
    user =                      models.OneToOneField(UserAccount, on_delete=models.CASCADE)
    document_type_enterprise =  models.CharField(max_length=3, choices=DOCUMENT_TYPES_ENTERPRISES, default='NIT', blank=True, null=True)
    nuip_enterprise =           models.CharField(max_length=11, unique=True, blank=True, null=True)
    rut =                       models.ImageField(upload_to=image_rut_directory_path, blank=True, null=True)
    description =               models.TextField(blank=True, null=True)
    niche =                     models.CharField(max_length=120, blank=True, null=True)
    address =                   models.CharField(max_length=100, blank=True, null=True)
    facebook =                  models.CharField(max_length=100, blank=True, null=True)
    instagram =                 models.CharField(max_length=100, blank=True, null=True)
    X =                         models.CharField(max_length=100, blank=True, null=True)
    monthly_fee =               models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    created_at =                models.DateTimeField(auto_now_add=True)
    updated_at =                models.DateTimeField(auto_now=True)
    class Meta:
        verbose_name = "Perfil Empresarial"
        verbose_name_plural = "Perfiles Empresariales"
        ordering = ["-created_at"]
        
    def __str__(self):
        return str(self.user.email)


class OneTimePassword(models.Model):
    user = models.ForeignKey(
        UserAccount,
        on_delete=models.CASCADE,
        related_name="otp_codes",
    )
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.email} - {self.code}"

    @property
    def is_expired(self):
        return timezone.now() >= self.expires_at

    @classmethod
    def create_for_user(cls, user, minutes=10):
        # Eliminar todos los códigos OTP anteriores del usuario (usados, no usados, expirados)
        cls.objects.filter(user=user).delete()
        return cls.objects.create(
            user=user,
            code=f"{uuid.uuid4().int % 1000000:06d}",
            expires_at=timezone.now() + timedelta(minutes=minutes),
        )


class EnterpriseMonthlyPayment(models.Model):
    STATUS_PENDING = "pending"
    STATUS_PAID = "paid"
    STATUS_OVERDUE = "overdue"
    STATUS_CHOICES = (
        (STATUS_PENDING, "Pending"),
        (STATUS_PAID, "Paid"),
        (STATUS_OVERDUE, "Overdue"),
    )
    METHOD_TRANSFER = "transfer"
    METHOD_CASH = "cash"
    METHOD_CARD = "card"
    METHOD_PSE = "pse"
    METHOD_CHOICES = (
        (METHOD_TRANSFER, "Transferencia"),
        (METHOD_CASH, "Efectivo"),
        (METHOD_CARD, "Tarjeta"),
        (METHOD_PSE, "PSE"),
    )

    enterprise = models.ForeignKey(
        UserAccount,
        on_delete=models.CASCADE,
        related_name="monthly_payments",
    )
    year = models.PositiveIntegerField()
    month = models.PositiveSmallIntegerField()
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    due_date = models.DateField()
    grace_date = models.DateField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_PENDING)
    payment_method = models.CharField(max_length=20, choices=METHOD_CHOICES, blank=True, null=True)
    payment_reference = models.CharField(max_length=120, blank=True, null=True)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    payment_proof = models.FileField(upload_to="payments/proofs/", blank=True, null=True)
    paid_reported_by = models.ForeignKey(
        UserAccount,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="reported_payments",
    )
    paid_at = models.DateTimeField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-year", "-month"]
        unique_together = ("enterprise", "year", "month")

    def __str__(self):
        return f"{self.enterprise.enterprise or self.enterprise.email} {self.month}/{self.year}"


class EnterprisePaymentNotificationLog(models.Model):
    STAGE_1 = 1
    STAGE_2 = 2
    STAGE_3 = 3
    STAGE_4 = 4
    STAGE_5 = 5
    STAGE_CHOICES = (
        (STAGE_1, "Vence en 2 dias"),
        (STAGE_2, "Vence en 1 dia"),
        (STAGE_3, "Vence hoy"),
        (STAGE_4, "Dia 1 de gracia"),
        (STAGE_5, "Dia 2 de gracia / bloqueado"),
    )

    payment = models.ForeignKey(
        EnterpriseMonthlyPayment,
        on_delete=models.CASCADE,
        related_name="notification_logs",
    )
    enterprise = models.ForeignKey(
        UserAccount,
        on_delete=models.CASCADE,
        related_name="payment_notification_logs",
    )
    stage = models.PositiveSmallIntegerField(choices=STAGE_CHOICES)
    stage_label = models.CharField(max_length=120)
    email_sent = models.BooleanField(default=False)
    sms_sent = models.BooleanField(default=False)
    sent_to_email = models.EmailField(blank=True, null=True)
    sent_to_phone = models.CharField(max_length=30, blank=True, null=True)
    metadata = models.JSONField(default=dict, blank=True)
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-sent_at"]
        unique_together = ("payment", "stage")

    def __str__(self):
        return f"Notif stage {self.stage} - {self.enterprise.email} - pago {self.payment_id}"


@receiver(post_save, sender=UserAccount)
def create_user_profile(sender, instance, created, **kwargs):
    if created and instance.role == "enterprise":
        UserProfile.objects.get_or_create(user=instance)
