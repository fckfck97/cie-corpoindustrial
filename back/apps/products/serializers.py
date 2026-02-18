from rest_framework import serializers
from .models import Product, ProductRedemption
from apps.user.serializers import UserEmployeesProfileSerializer
from apps.user.models import UserProfile


class ProductSerializer(serializers.ModelSerializer):
    redemptions_count = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            'id',
            'name',
            'description',
            'image',
            'user',
            'created',
            'updated',
            'finished',
            'views',
            'category',
            'subcategory',
            'extracategory',
            'redemptions_count',
        )

    def get_redemptions_count(self, obj):
        if hasattr(obj, "redemptions_count"):
            return obj.redemptions_count or 0
        return obj.redemptions.count()


class ProductDashboardSerializer(serializers.ModelSerializer):
    user = UserEmployeesProfileSerializer()
    class Meta:
        model = Product
        fields = ('id', 'name', 'description', 'image',  'user','views', 'category', 'subcategory', 'extracategory','created')


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = [
            "id",
            "user",
            "address",
            "facebook",
            "instagram",
            "X",
        ]

class ProductEmployeesSerializer(serializers.ModelSerializer):
    user = UserEmployeesProfileSerializer()
    enterprise_id = serializers.CharField(source="user_id", read_only=True)
    redemptions_count = serializers.SerializerMethodField()
    already_redeemed = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            'id',
            'name',
            'description',
            'image',
            'user',
            'enterprise_id',
            'views',
            'category',
            'subcategory',
            'extracategory',
            'created',
            'redemptions_count',
            'already_redeemed',
        )

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        # Asegúrate de que la instancia de usuario tiene un perfil antes de intentar serializarlo
        user_profile = getattr(instance.user, 'userprofile', None)
        if user_profile:
            representation['profile'] = UserProfileSerializer(user_profile).data
        return representation

    def get_redemptions_count(self, obj):
        if hasattr(obj, "redemptions_count"):
            return obj.redemptions_count or 0
        return obj.redemptions.count()

    def get_already_redeemed(self, obj):
        if hasattr(obj, "already_redeemed"):
            return bool(obj.already_redeemed)
        return False


class EmployeeBenefitListSerializer(serializers.ModelSerializer):
    enterprise_id = serializers.CharField(source="user_id", read_only=True)
    enterprise = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()
    redemptions_count = serializers.SerializerMethodField()
    already_redeemed = serializers.BooleanField(read_only=True)

    class Meta:
        model = Product
        fields = (
            "id",
            "name",
            "description",
            "category",
            "subcategory",
            "image",
            "created",
            "enterprise_id",
            "enterprise",
            "redemptions_count",
            "already_redeemed",
        )

    def get_enterprise(self, obj):
        if not obj.user:
            return None
        return obj.user.enterprise or obj.user.username

    def get_image(self, obj):
        if not obj.image:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url

    def get_redemptions_count(self, obj):
        if hasattr(obj, "redemptions_count"):
            return obj.redemptions_count or 0
        return obj.redemptions.count()


class EmployeeBenefitSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = (
            "id",
            "name",
            "category",
        )


class ProductRedemptionSerializer(serializers.ModelSerializer):
    product_name = serializers.SerializerMethodField()
    product_deleted = serializers.SerializerMethodField()
    employee_name = serializers.CharField(source='employee.first_name', read_only=True)
    employee_last_name = serializers.CharField(source='employee.last_name', read_only=True)
    employee_email = serializers.EmailField(source='employee.email', read_only=True)
    enterprise_name = serializers.SerializerMethodField()

    class Meta:
        model = ProductRedemption
        fields = [
            'id',
            'product',
            'product_deleted',
            'product_name',
            'product_id_snapshot',
            'employee',
            'employee_name',
            'employee_last_name',
            'employee_email',
            'enterprise',
            'enterprise_name',
            'redeemed_date',
            'redeemed_at',
        ]

    def get_product_name(self, obj):
        if obj.product:
            return obj.product.name
        return obj.product_name_snapshot

    def get_product_deleted(self, obj):
        return obj.product is None

    def get_enterprise_name(self, obj):
        if not obj.enterprise:
            return obj.enterprise_name_snapshot or None
        return obj.enterprise.enterprise or obj.enterprise.username
