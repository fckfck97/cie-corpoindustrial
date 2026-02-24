from rest_framework import serializers
from .models import JobBoard, JobApplication
from apps.user.serializers import UserEmployeesProfileSerializer
from apps.user.models import UserProfile


class JobBoardSerializer(serializers.ModelSerializer):
    applications_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = JobBoard
        fields = (
            'id',
            'title',
            'description',
            'priority',
            'image',
            'user',
            'created',
            'updated',
            'status',
            'start_date',
            'end_date',
            'applications_count',
        )


class JobDashboardSerializer(serializers.ModelSerializer):
    user = UserEmployeesProfileSerializer()
    class Meta:
        model = JobBoard
        fields = ('id', 'title', 'description', 'image', 'priority', 'user', 'created', 'updated', 'status', 'start_date', 'end_date')

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
class JobBoardEmployeesSerializer(serializers.ModelSerializer):
    user = UserEmployeesProfileSerializer()
    applications_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = JobBoard
        fields = ('id', 'title', 'description', 'image', 'priority', 'user', 'created', 'updated', 'status', 'start_date', 'end_date', 'applications_count')
        
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        # Asegúrate de que la instancia de usuario tiene un perfil antes de intentar serializarlo
        user_profile = getattr(instance.user, 'userprofile', None)
        if user_profile:
            representation['profile'] = UserProfileSerializer(user_profile).data
        return representation


class EmployeeJobListSerializer(serializers.ModelSerializer):
    enterprise_id = serializers.CharField(source="user_id", read_only=True)
    enterprise = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()
    applications_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = JobBoard
        fields = (
            "id",
            "title",
            "description",
            "priority",
            "status",
            "image",
            "created",
            "enterprise_id",
            "enterprise",
            "applications_count",
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


class EmployeeJobSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = JobBoard
        fields = (
            "id",
            "title",
            "priority",
            "status",
        )

class JobApplicationSerializer(serializers.ModelSerializer):
    job_title = serializers.CharField(source='job.title', read_only=True)
    enterprise_name = serializers.SerializerMethodField()
    cv_url = serializers.SerializerMethodField()

    class Meta:
        model = JobApplication
        fields = [
            'id',
            'job',
            'job_title',
            'enterprise_name',
            'origin',
            'applicant',
            'full_name',
            'email',
            'phone',
            'cv',
            'cv_url',
            'cover_letter',
            'created_at',
        ]

    def get_enterprise_name(self, obj):
        if not obj.job or not obj.job.user:
            return None
        return obj.job.user.enterprise or obj.job.user.username

    def get_cv_url(self, obj):
        if not obj.cv:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.cv.url)
        return obj.cv.url
