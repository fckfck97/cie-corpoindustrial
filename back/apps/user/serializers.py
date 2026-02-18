from djoser.serializers import PasswordResetConfirmSerializer
from djoser.serializers import UserCreatePasswordRetypeSerializer
from django.contrib.auth import get_user_model
from rest_framework import serializers
from django.utils.crypto import get_random_string
User = get_user_model()
from .models import UserProfile, EnterpriseMonthlyPayment

class UserCreateSerializer(UserCreatePasswordRetypeSerializer):
    class Meta(UserCreatePasswordRetypeSerializer.Meta):
        model = User
        fields = [
            "id",
            "email",
            "username",
            "password",
            "re_password",
            "first_name",
            "last_name",
            "role",
        ]


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "username",
            "picture",
            "banner",
            "first_name",
            "last_name",
            "is_active",
            "is_staff",
            "role",
            "verified",
            "date_joined",
            "updated_at",
            "enterprise",
            "document_type",
            "nuip",
        ]


class EditUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User  # Add the model attribute here
        fields = [
            "id",
            "email",
            "username",
            "first_name",
            "last_name",
            "updated_at",
            "enterprise",
            "document_type",
            "nuip",
            "role",
        ]


class EditUserEnterpriseSerializer(serializers.ModelSerializer):
    picture = serializers.ImageField(required=False)
    banner = serializers.ImageField(required=False)
    class Meta:
        model = User  # Add the model attribute here
        fields = [
            "id",
            "email",
            "username",
            "first_name",
            "last_name",
            "updated_at",
            "enterprise",
            "document_type",
            "nuip",
            "role",
            "picture",
            "banner",
        ]
        
class EditUserEmployeesSerializer(serializers.ModelSerializer):
    picture = serializers.ImageField(required=False)
    banner = serializers.ImageField(required=False)
    class Meta:
        model = User  # Add the model attribute here
        fields = [
            "id",
            "document_type",
            "nuip",
            "first_name",
            "last_name",
            "enterprise",
            "email",
            "username",
            "updated_at",
            "role",
            "picture",
            "banner"
        ]
        
        
        
class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer()
    class Meta:
        model = UserProfile
        fields = [
            "id",
            "user",
            "document_type_enterprise",
            "nuip_enterprise",
            "rut",
            "description",
            "niche",
            "phone",
            "address",
            "facebook",
            "instagram",
            "X",
        ]
        
        
        
# PERFIL DE EMPRESA VISTO COMO EMPLEADO
class UserEmployeesProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "picture",
            "enterprise",
            "banner"
        ]
        
class UserEnterpriseProfileSerializer(serializers.ModelSerializer):
    user = UserEmployeesProfileSerializer()
    class Meta:
        model = UserProfile
        fields = [
            "id",
            "user",
            "description",
            "niche",
            "phone",
            "address",
            "facebook",
            "instagram",
            "X",
        ]


class EmployeeEnterpriseListSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    description = serializers.CharField(source="userprofile.description", read_only=True)
    niche = serializers.CharField(source="userprofile.niche", read_only=True)
    phone = serializers.CharField(source="userprofile.phone", read_only=True)
    address = serializers.CharField(source="userprofile.address", read_only=True)
    facebook = serializers.CharField(source="userprofile.facebook", read_only=True)
    instagram = serializers.CharField(source="userprofile.instagram", read_only=True)
    X = serializers.CharField(source="userprofile.X", read_only=True)
    avatar = serializers.SerializerMethodField()
    banner = serializers.SerializerMethodField()
    jobs_count = serializers.IntegerField(read_only=True)
    benefits_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "name",
            "email",
            "description",
            "niche",
            "phone",
            "address",
            "facebook",
            "instagram",
            "X",
            "avatar",
            "banner",
            "jobs_count",
            "benefits_count",
        ]

    def get_name(self, obj):
        return obj.enterprise or obj.username

    def _build_media_url(self, field):
        if not field:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(field.url)
        return field.url

    def get_avatar(self, obj):
        return self._build_media_url(obj.picture)

    def get_banner(self, obj):
        return self._build_media_url(obj.banner)
class CustomPasswordResetConfirmSerializer(PasswordResetConfirmSerializer):
    def build_password_reset_confirm_url(self, uid, token):
        url = f"?forgot_password_confirm=True&uid={uid}&token={token}"
        return url


class OTPWebRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class OTPWebVerifySerializer(serializers.Serializer):
    identifier = serializers.CharField()
    otp = serializers.CharField(min_length=6, max_length=6)
    source = serializers.CharField(required=False, allow_blank=True)


class UserCreateByRoleSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    picture = serializers.ImageField(required=False)
    banner = serializers.ImageField(required=False)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "username",
            "password",
            "first_name",
            "last_name",
            "enterprise",
            "document_type",
            "nuip",
            "role",
            "verified",
            "is_active",
            "picture",
            "banner",
        ]
        read_only_fields = ["id", "verified", "is_active"]

    def create(self, validated_data):
        password = validated_data.pop("password", "") or get_random_string(12)
        user = User.objects.create_user(password=password, **validated_data)
        return user


class EnterpriseMonthlyPaymentSerializer(serializers.ModelSerializer):
    enterprise_name = serializers.CharField(source="enterprise.enterprise", read_only=True)
    enterprise_email = serializers.CharField(source="enterprise.email", read_only=True)
    payment_proof_url = serializers.SerializerMethodField()
    paid_reported_by_email = serializers.CharField(source="paid_reported_by.email", read_only=True)

    class Meta:
        model = EnterpriseMonthlyPayment
        fields = [
            "id",
            "enterprise",
            "enterprise_name",
            "enterprise_email",
            "year",
            "month",
            "amount",
            "due_date",
            "grace_date",
            "status",
            "payment_method",
            "payment_reference",
            "paid_amount",
            "payment_proof",
            "payment_proof_url",
            "paid_reported_by",
            "paid_reported_by_email",
            "paid_at",
            "notes",
        ]
        read_only_fields = ["paid_reported_by"]

    def get_payment_proof_url(self, obj):
        if not obj.payment_proof:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.payment_proof.url)
        return obj.payment_proof.url
