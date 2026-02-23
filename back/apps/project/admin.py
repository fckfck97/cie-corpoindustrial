from django.contrib import admin
from .models import Project, ProjectApplication
from unfold.admin import ModelAdmin

@admin.register(Project)
class ProjectAdmin(ModelAdmin):
    list_display = ('title', 'amount', 'department', 'municipality', 'status', 'created')
    search_fields = ('title', 'department', 'municipality')
    list_filter = ('status', 'priority', 'department')
    ordering = ('-created',)

@admin.register(ProjectApplication)
class ProjectApplicationAdmin(ModelAdmin):
    list_display = ('id', 'project', 'full_name', 'email', 'created_at')
    search_fields = ('full_name', 'email', 'project__title')
    list_filter = ('created_at',)
    ordering = ('-created_at',)
