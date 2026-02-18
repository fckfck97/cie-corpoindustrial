from django.contrib import admin
from .models import JobBoard
from unfold.admin import ModelAdmin
@admin.register(JobBoard)
class JobBoardAdmin(ModelAdmin):
    list_display = ('title', 'status', 'created', 'updated')
    list_filter = ('status', 'created', 'updated')
    search_fields = ('title', 'description')
    date_hierarchy = 'created'
    ordering = ('-created',)
    fieldsets = (
        (None, {
            'fields': ('title', 'description', 'user', 'image', 'priority')
        }),
        ('Status', {
            'fields': ('status',)
        }),
    )