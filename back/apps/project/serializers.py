from rest_framework import serializers
from .models import (
    Project,
    ProjectApplication,
    LicitationOpportunity,
    LicitationApplication,
)
from apps.user.serializers import UserSerializer

class ProjectSerializer(serializers.ModelSerializer):
    applications_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Project
        fields = (
            'id',
            'title',
            'description',
            'department',
            'municipality',
            'priority',
            'user',
            'created',
            'updated',
            'status',
            'start_date',
            'end_date',
            'applications_count',
        )

class ProjectDashboardSerializer(serializers.ModelSerializer):
    user = UserSerializer()

    class Meta:
        model = Project
        fields = (
            'id', 'title', 'description', 'department', 'municipality',
            'priority', 'user', 'created', 'updated', 'status', 'start_date', 'end_date'
        )

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


class LicitationOpportunitySerializer(serializers.ModelSerializer):
    applications_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = LicitationOpportunity
        fields = (
            'id',
            'title',
            'description',
            'department',
            'municipality',
            'priority',
            'user',
            'created',
            'updated',
            'status',
            'start_date',
            'end_date',
            'applications_count',
        )


class LicitationApplicationSerializer(serializers.ModelSerializer):
    licitation_title = serializers.CharField(source='licitation.title', read_only=True)
    applicant_name = serializers.SerializerMethodField()
    enterprise_name = serializers.SerializerMethodField()

    class Meta:
        model = LicitationApplication
        fields = [
            'id',
            'licitation',
            'licitation_title',
            'applicant',
            'applicant_name',
            'enterprise_name',
            'full_name',
            'email',
            'phone',
            'message',
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
