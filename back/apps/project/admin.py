from django.contrib import admin
from .models import (
    Project,
    ProjectApplication,
    LicitationOpportunity,
    LicitationApplication,
)
from unfold.admin import ModelAdmin

@admin.register(Project)
class ProjectAdmin(ModelAdmin):
    list_display = ('title', 'department', 'municipality', 'status', 'created')
    search_fields = ('title', 'department', 'municipality')
    list_filter = ('status', 'priority', 'department')
    ordering = ('-created',)

@admin.register(ProjectApplication)
class ProjectApplicationAdmin(ModelAdmin):
    list_display = ('id', 'project', 'full_name', 'email', 'created_at')
    search_fields = ('full_name', 'email', 'project__title')
    list_filter = ('created_at',)
    ordering = ('-created_at',)


@admin.register(LicitationOpportunity)
class LicitationOpportunityAdmin(ModelAdmin):
    list_display = ('title', 'opportunity_type', 'economic_sector', 'department', 'municipality', 'status', 'created')
    search_fields = ('title', 'economic_sector', 'contracting_entity', 'department', 'municipality')
    list_filter = ('status', 'priority', 'opportunity_type', 'department')
    ordering = ('-created',)


@admin.register(LicitationApplication)
class LicitationApplicationAdmin(ModelAdmin):
    list_display = ('id', 'licitation', 'company_name', 'full_name', 'email', 'interest_type', 'created_at')
    search_fields = ('full_name', 'email', 'company_name', 'company_sector', 'licitation__title')
    list_filter = ('created_at',)
    ordering = ('-created_at',)
