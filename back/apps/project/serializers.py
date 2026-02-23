from rest_framework import serializers
from .models import Project, ProjectApplication
from apps.user.serializers import UserSerializer

class ProjectSerializer(serializers.ModelSerializer):
    applications_count = serializers.IntegerField(read_only=True)
    invested_amount = serializers.DecimalField(max_digits=20, decimal_places=2, read_only=True, required=False)
    remaining_amount = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = (
            'id',
            'title',
            'description',
            'amount',
            'invested_amount',
            'remaining_amount',
            'department',
            'municipality',
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

    def get_remaining_amount(self, obj):
        invested = getattr(obj, 'invested_amount', 0) or 0
        return max(0, obj.amount - invested)

class ProjectDashboardSerializer(serializers.ModelSerializer):
    user = UserSerializer()
    invested_amount = serializers.DecimalField(max_digits=20, decimal_places=2, read_only=True, required=False)
    remaining_amount = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = (
            'id', 'title', 'description', 'amount', 'invested_amount', 'remaining_amount', 'department', 'municipality', 
            'image', 'priority', 'user', 'created', 'updated', 'status', 'start_date', 'end_date'
        )

    def get_remaining_amount(self, obj):
        invested = getattr(obj, 'invested_amount', 0) or 0
        return max(0, obj.amount - invested)

class ProjectApplicationSerializer(serializers.ModelSerializer):
    project_title = serializers.CharField(source='project.title', read_only=True)
    applicant_name = serializers.SerializerMethodField()
    enterprise_name = serializers.SerializerMethodField()

    class Meta:
        model = ProjectApplication
        fields = [
            'id',
            'project',
            'project_title',
            'applicant',
            'applicant_name',
            'enterprise_name',
            'full_name',
            'email',
            'phone',
            'message',
            'capital_investment',
            'created_at',
        ]

    def get_applicant_name(self, obj):
        if not obj.applicant:
            return None
        return obj.applicant.first_name + ' ' + obj.applicant.last_name or obj.applicant.username

    def get_enterprise_name(self, obj):
        if not obj.applicant:
            return None
        return obj.applicant.enterprise or obj.applicant.username
